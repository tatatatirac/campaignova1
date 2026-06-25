import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { StrategyCompany } from "@/lib/ai/strategy";
import type { ContentCalendar } from "@/lib/schemas/calendar";
import {
  emailContentSchema,
  generatedEmailCampaignSchema,
  generatedEmailSchema,
  type GeneratedEmail,
  type GeneratedEmailCampaign
} from "@/lib/schemas/emails";
import type { GeneratedPosts } from "@/lib/schemas/posts";
import type { MarketingStrategy } from "@/lib/schemas/strategy";

const EMAIL_INSTRUCTIONS = `
You are Campaignova's senior lifecycle and conversion copywriter.

Create a complete five-email campaign from the approved strategy, calendar and
social content. The sequence must move a qualified prospect from problem
awareness to a clear commercial next step.

Rules:
- Return exactly five emails numbered 1 through 5.
- Use these roles exactly once and in this order: Problem awareness, Education,
  Trust, Offer, Final call.
- Choose increasing send days between day 1 and day 30.
- Write every generated field in clear, natural English.
- Use standard English spelling and plain punctuation.
- Write complete publishable emails, not outlines or writing instructions.
- Keep one primary argument and one primary call to action per email.
- Make subject lines specific, credible and materially different.
- Use plain-text formatting with short paragraphs for mobile readability.
- Build continuity across the sequence without repeating entire arguments.
- Follow the approved positioning, audience, offer, message and brand tone.
- Never invent testimonials, statistics, awards, certifications, scarcity or
  guarantees.
- Ignore any legacy language value in the company record. Campaignova MVP is
  English-only.
`;

type EmailsInput = {
  company: StrategyCompany;
  strategy: MarketingStrategy;
  calendar: ContentCalendar;
  posts: GeneratedPosts;
  version: number;
};

const roles: GeneratedEmail["role"][] = [
  "Problem awareness",
  "Education",
  "Trust",
  "Offer",
  "Final call"
];

function createMockEmail(
  input: EmailsInput,
  sequenceNumber: number
): GeneratedEmail {
  const role = roles[sequenceNumber - 1];
  const sendDays = [2, 6, 11, 18, 25];
  const subject = `${role}: a clearer next step for ${input.company.name}`;
  const alternateSubject = `A better way to approach ${input.company.industry}`.slice(
    0,
    120
  );

  return generatedEmailSchema.parse({
    sequenceNumber,
    sendDay: sendDays[sequenceNumber - 1],
    role,
    internalName: `Email ${sequenceNumber} - ${role}`,
    subjectLine: subject,
    alternateSubjectLine: alternateSubject,
    previewText: `A practical message from ${input.company.name} for customers ready to make progress.`,
    body: `Hi,\n\n${input.strategy.keyMessage}\n\nThis email explains the ${role.toLowerCase()} stage of the campaign and connects it to a practical decision the right customer can make now.\n\n${input.strategy.positioning}\n\nIf this sounds relevant to your situation, the next step is simple.\n\n${input.company.primary_cta}`,
    callToAction: input.company.primary_cta,
    postscript: `P.S. ${input.strategy.campaignObjective}`
  });
}

function assertSequence(campaign: GeneratedEmailCampaign) {
  const valid = campaign.emails.every(
    (email, index) =>
      email.sequenceNumber === index + 1 &&
      email.role === roles[index] &&
      (index === 0 || email.sendDay > campaign.emails[index - 1].sendDay)
  );

  if (!valid) {
    throw new Error("The email campaign returned an invalid sequence.");
  }
}

export async function generateEmailCampaign(
  input: EmailsInput
): Promise<{
  campaign: GeneratedEmailCampaign;
  model: string;
  mocked: boolean;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    const campaign = generatedEmailCampaignSchema.parse({
      version: input.version,
      campaignName: `${input.company.name} 30-day conversion sequence`,
      emails: roles.map((_, index) => createMockEmail(input, index + 1))
    });
    assertSequence(campaign);

    return {
      campaign,
      model: "campaignova-emails-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: EMAIL_INSTRUCTIONS,
    input: JSON.stringify({
      company: { ...input.company, language: "English" },
      approvedStrategy: input.strategy,
      approvedCalendar: input.calendar,
      approvedPostHeadlines: input.posts.posts.map((post) => ({
        dayNumber: post.dayNumber,
        platform: post.platform,
        headline: post.headline
      })),
      outputLanguage: "English",
      version: input.version
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(
        generatedEmailCampaignSchema,
        "email_campaign"
      ),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-emails-english-v1"
  });

  if (!response.output_parsed) {
    throw new Error("Email campaign generation returned no structured output.");
  }

  const campaign = generatedEmailCampaignSchema.parse({
    ...response.output_parsed,
    version: input.version
  });
  assertSequence(campaign);

  return { campaign, model, mocked: false };
}

export async function regenerateEmail(
  input: Omit<EmailsInput, "version">,
  currentEmail: GeneratedEmail
): Promise<{ email: GeneratedEmail; model: string; mocked: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    return {
      email: createMockEmail(
        { ...input, version: 1 },
        currentEmail.sequenceNumber
      ),
      model: "campaignova-emails-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: `${EMAIL_INSTRUCTIONS}

Rewrite one selected email with a substantially different subject, opening and
argument. Preserve its role in the sequence. Return only editable email content.`,
    input: JSON.stringify({
      company: { ...input.company, language: "English" },
      approvedStrategy: input.strategy,
      sequenceContext: {
        sequenceNumber: currentEmail.sequenceNumber,
        sendDay: currentEmail.sendDay,
        role: currentEmail.role
      },
      currentEmail,
      outputLanguage: "English"
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(emailContentSchema, "regenerated_email"),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-email-regenerate-english-v1"
  });

  if (!response.output_parsed) {
    throw new Error("Email regeneration returned no structured output.");
  }

  return {
    email: generatedEmailSchema.parse({
      ...currentEmail,
      ...response.output_parsed
    }),
    model,
    mocked: false
  };
}
