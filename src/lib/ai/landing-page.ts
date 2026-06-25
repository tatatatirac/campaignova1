import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { StrategyCompany } from "@/lib/ai/strategy";
import type { GeneratedEmailCampaign } from "@/lib/schemas/emails";
import {
  landingPageSchema,
  type LandingPage
} from "@/lib/schemas/landing-page";
import type { MarketingStrategy } from "@/lib/schemas/strategy";

const LANDING_PAGE_INSTRUCTIONS = `
You are Campaignova's senior conversion strategist and landing-page copywriter.

Create complete, publishable copy for one focused conversion landing page. The
page must turn qualified campaign traffic into the company's primary call to
action.

Rules:
- Write every generated field in clear, natural English.
- Use standard English spelling and plain punctuation.
- Make the hero specific enough that the right customer immediately knows the
  offer, outcome and next step.
- Keep one audience, one offer and one primary conversion action throughout.
- Build a logical flow: problem, solution, benefits, process, offer, trust,
  objections and final call to action.
- Make the three process steps cover the full scope claimed by the offer. If
  the offer includes delivery or installation, the final step must include it.
- Make sections materially different instead of repeating the hero.
- Use short paragraphs and scannable copy suitable for mobile screens.
- Align the page with the approved strategy and email campaign.
- Use only supplied facts. Never invent testimonials, customer counts,
  statistics, awards, certifications, guarantees, deadlines or scarcity.
- Trust content must explain credible process and fit, not fabricate proof.
- FAQ answers must resolve practical purchase objections directly.
- Ignore any legacy language value in the company record. Campaignova MVP is
  English-only.
`;

type LandingPageInput = {
  company: StrategyCompany;
  strategy: MarketingStrategy;
  emails: GeneratedEmailCampaign;
  version: number;
};

function fitText(value: string, maximum: number) {
  if (value.length <= maximum) {
    return value;
  }

  const shortened = value.slice(0, maximum);
  const lastSpace = shortened.lastIndexOf(" ");
  return shortened.slice(0, lastSpace > 0 ? lastSpace : maximum).trimEnd();
}

function createMockLandingPage(input: LandingPageInput): LandingPage {
  const company = input.company;
  const cta = company.primary_cta;

  return landingPageSchema.parse({
    version: input.version,
    pageName: fitText(`${company.name} conversion landing page`, 140),
    seo: {
      title: fitText(`${company.name} | ${company.industry}`, 70),
      description: fitText(
        `Discover how ${company.name} helps the right customers move forward with a clear ${company.industry.toLowerCase()} process in ${company.location}. ${cta} to discuss fit.`,
        180
      )
    },
    hero: {
      eyebrow: fitText(`${company.industry} in ${company.location}`, 80),
      headline: fitText(input.strategy.keyMessage, 140),
      subheadline: fitText(
        `${input.strategy.positioning} Start with a clear plan, a focused process and one practical next step.`,
        450
      ),
      primaryCallToAction: cta,
      secondaryCallToAction: "See how it works"
    },
    problem: {
      headline: "The real problem is not effort. It is disconnected decisions.",
      body: `${input.strategy.idealCustomer} Without a clear process, important decisions compete for attention, progress slows down and the customer carries more uncertainty than necessary.`,
      painPoints: [
        "Too many disconnected decisions make progress harder to manage.",
        "Unclear priorities create avoidable delays and second-guessing.",
        "A fragmented process makes it difficult to see the right next step."
      ]
    },
    solution: {
      headline: "One clear direction from the first decision to the next step",
      body: `${company.name} brings the offer, process and desired outcome into one focused path. ${input.strategy.coreOffer}`
    },
    benefits: {
      headline: "A better way to move from intention to action",
      introduction:
        "The experience is designed to reduce uncertainty, improve decision quality and keep the work connected to the outcome that matters.",
      items: [
        {
          title: "Clear priorities",
          description:
            "Know what deserves attention first and how each decision supports the larger goal."
        },
        {
          title: "Expert direction",
          description:
            "Use a practical point of view to make confident choices without unnecessary complexity."
        },
        {
          title: "A defined next step",
          description:
            "Move forward through a simple process with one clear call to action at every stage."
        }
      ]
    },
    process: {
      headline: "A simple process built around better decisions",
      introduction:
        "The first conversation establishes fit, direction and the most useful path forward.",
      steps: [
        {
          title: "Start with context",
          description:
            "Share the current situation, the desired outcome and the decisions that need clarity."
        },
        {
          title: "Build the direction",
          description:
            "Translate the goal into a focused plan with priorities, responsibilities and next actions."
        },
        {
          title: "Move forward",
          description:
            "Execute the agreed direction with a clear understanding of what happens next."
        }
      ]
    },
    offer: {
      headline: "A focused offer for customers ready to make progress",
      body: `${company.offer.replace(/[.!?]+$/, "")}. The offer is designed for the audience described above and begins with a direct conversation about fit, priorities and the desired outcome.`,
      inclusions: [
        "A clear starting point based on the customer's current situation.",
        "A focused recommendation connected to the approved objective.",
        "A practical next step without unnecessary pressure or complexity."
      ],
      callToAction: cta
    },
    trust: {
      headline: "Choose a process that makes the important decisions clearer",
      body: `${company.name} builds trust through useful guidance, a focused process and an honest conversation about fit. Customers can understand the direction and next step without vague promises.`,
      reasons: [
        {
          title: "Focused expertise",
          description:
            "The message and process stay centered on the defined audience, offer and outcome."
        },
        {
          title: "Transparent process",
          description:
            "Customers can understand the starting point, the decision path and the expected next step."
        },
        {
          title: "Practical communication",
          description:
            "Every section explains what matters without vague promises or invented proof."
        }
      ]
    },
    faq: {
      headline: "Questions before taking the next step",
      items: [
        {
          question: "Who is this offer designed for?",
          answer: `The approved audience is: ${company.audience} The offer is best suited to customers who value clear expert direction and are ready to discuss a practical path forward.`
        },
        {
          question: "What happens after I get in touch?",
          answer: `The first step is to ${cta.toLowerCase()}. That conversation is used to understand the situation, confirm fit and explain the most useful next action.`
        },
        {
          question: "Do I need to have every detail decided first?",
          answer:
            "No. The purpose of the first step is to bring structure to the situation and identify which decisions should happen first."
        },
        {
          question: "How do I know whether this is the right fit?",
          answer:
            "Fit depends on the problem, the desired outcome and whether the defined process matches the support you need. The first conversation should make that clear."
        },
        {
          question: "What should I prepare before the first conversation?",
          answer:
            "Bring a concise description of the current situation, the outcome you want and any constraints or decisions that may affect the next step."
        }
      ]
    },
    finalCallToAction: {
      headline: "Make the next decision with a clearer plan",
      body: `If the current approach feels fragmented or uncertain, start with one focused conversation with ${company.name}.`,
      callToAction: cta
    }
  });
}

export async function generateLandingPage(
  input: LandingPageInput
): Promise<{ page: LandingPage; model: string; mocked: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    return {
      page: createMockLandingPage(input),
      model: "campaignova-landing-page-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: LANDING_PAGE_INSTRUCTIONS,
    input: JSON.stringify({
      company: { ...input.company, language: "English" },
      approvedStrategy: input.strategy,
      approvedEmailSequence: input.emails.emails.map((email) => ({
        sequenceNumber: email.sequenceNumber,
        role: email.role,
        subjectLine: email.subjectLine,
        callToAction: email.callToAction
      })),
      outputLanguage: "English",
      version: input.version
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(landingPageSchema, "landing_page"),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-landing-page-english-v1"
  });

  if (!response.output_parsed) {
    throw new Error("Landing page generation returned no structured output.");
  }

  return {
    page: landingPageSchema.parse({
      ...response.output_parsed,
      version: input.version
    }),
    model,
    mocked: false
  };
}
