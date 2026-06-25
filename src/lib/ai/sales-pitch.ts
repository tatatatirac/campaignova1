import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { StrategyCompany } from "@/lib/ai/strategy";
import type { LandingPage } from "@/lib/schemas/landing-page";
import {
  salesPitchSchema,
  type SalesPitch
} from "@/lib/schemas/sales-pitch";
import type { MarketingStrategy } from "@/lib/schemas/strategy";

const SALES_PITCH_INSTRUCTIONS = `
You are Campaignova's senior sales strategist.

Create a practical sales conversation toolkit that helps the business owner
qualify the right prospect, explain the offer clearly, handle reasonable
objections and ask for the next step without pressure.

Rules:
- Write every generated field in clear, natural English.
- Use standard English spelling and plain punctuation.
- Write spoken language that sounds natural when read aloud.
- Keep the pitch aligned with the approved strategy and landing-page promise.
- Use one audience, one offer, one differentiator and one primary next step.
- The elevator pitch must explain who the company helps, the problem, the
  outcome and why the approach is different.
- Discovery questions must uncover fit, urgency, priorities, decision process
  and practical constraints without interrogating the prospect.
- The offer presentation must connect the prospect's stated problem to the
  actual service and process.
- Objection responses must acknowledge the concern, answer it honestly and
  return to a useful question.
- Include exactly five distinct, realistic objections.
- Do not invent prices, discounts, availability, testimonials, statistics,
  guarantees, awards, certifications or urgency.
- Never encourage manipulation, false scarcity or pressure tactics.
- Ignore any legacy language value in the company record. Campaignova MVP is
  English-only.
`;

type SalesPitchInput = {
  company: StrategyCompany;
  strategy: MarketingStrategy;
  landingPage: LandingPage;
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

function createMockSalesPitch(input: SalesPitchInput): SalesPitch {
  const { company, strategy } = input;

  return salesPitchSchema.parse({
    version: input.version,
    pitchName: fitText(`${company.name} sales conversation toolkit`, 140),
    audienceSnapshot: {
      problem: fitText(
        `The prospect is considering ${company.offer.toLowerCase()} but does not want to carry every important decision, detail or coordination task alone.`,
        500
      ),
      desiredOutcome: fitText(
        input.landingPage.hero.subheadline,
        500
      ),
      buyingTrigger:
        "The prospect recognizes that the current approach is fragmented, costly in time or difficult to manage and is ready to discuss a better path."
    },
    elevatorPitch: fitText(
      `${company.name} provides ${company.offer.toLowerCase()} for customers in ${company.location}. The company replaces disconnected decisions with one focused process and expert direction built around a simple belief: ${strategy.keyMessage} The next step is to ${company.primary_cta.toLowerCase()}.`,
      800
    ),
    conversationPitch: {
      opener: `Thanks for taking the time to speak with me. Before I explain how ${company.name} works, I would like to understand what you are trying to accomplish and what has made it difficult so far.`,
      discoveryQuestions: [
        "What result are you hoping to achieve, and why does it matter now?",
        "What have you already tried or considered before this conversation?",
        "Which part of the current situation is creating the most friction?",
        "Who else is involved in deciding how you move forward?",
        "What practical constraints should we consider before recommending a next step?"
      ],
      transition:
        "Based on what you have shared, the main issue is not a lack of effort. It is the need for a clearer process that connects the important decisions to the outcome you want.",
      offerPresentation: fitText(
        `${company.name} provides ${company.offer}. The work is designed around the approved positioning: ${strategy.positioning} We begin by clarifying the current situation and the desired outcome, then define the right direction and explain what should happen next. The goal is to reduce uncertainty and give the customer a practical path forward.`,
        1_200
      ),
      differentiator: fitText(
        company.differentiator ||
          `${company.name} combines focused expert direction with a clear process designed for the specific audience and outcome.`,
        600
      ),
      callToAction: `The best next step is to ${company.primary_cta.toLowerCase()} so we can confirm fit, priorities and the most useful path forward.`
    },
    objections: [
      {
        objection: "I need more time to think about it.",
        response:
          "That makes sense. A considered decision is better than a rushed one. It may help to identify which part still feels unclear so you can evaluate the offer against the outcome you actually need.",
        bridgeQuestion:
          "What information would make the decision easier to evaluate?"
      },
      {
        objection: "I am not sure this is the right fit.",
        response:
          "Fit should be clear before either side moves forward. We can compare your priorities, the scope of the offer and the way the process works without forcing a decision.",
        bridgeQuestion:
          "Which part of the offer or process feels least aligned with what you need?"
      },
      {
        objection: "I want to compare other options first.",
        response:
          "That is reasonable. The useful comparison is not only the service description, but who leads the work, how decisions are handled and whether the process supports the outcome you want.",
        bridgeQuestion:
          "What criteria will matter most when you compare the available options?"
      },
      {
        objection: "This feels like a bigger commitment than I expected.",
        response:
          "It is important that the scope matches the seriousness of the problem. We should clarify what the complete process includes and whether that level of support is appropriate for your situation.",
        bridgeQuestion:
          "Which part of the commitment feels larger than expected?"
      },
      {
        objection: "I need to discuss it with someone else.",
        response:
          "That is a normal part of an important decision. We can make sure you have a clear summary of the problem, the proposed approach and the next step so the other decision-maker has useful context.",
        bridgeQuestion:
          "What questions is the other decision-maker most likely to ask?"
      }
    ],
    closing: {
      summary: fitText(
        `You want a clearer path forward, and the current situation is creating avoidable uncertainty. ${company.name} can help through ${company.offer} and a focused process built around the priorities we discussed.`,
        600
      ),
      directClose: `If the approach feels aligned, the next step is to ${company.primary_cta.toLowerCase()}. Would you like to move forward with that?`,
      lowPressureClose:
        "If you are not ready to decide today, let us identify the one question that still needs an answer and agree on a useful follow-up."
    },
    followUp: {
      emailSubject: `Next steps with ${company.name}`,
      emailBody: fitText(
        `Hi,\n\nThank you for the conversation. Based on what you shared, the main priority is creating a clearer path forward without carrying the current level of uncertainty or coordination alone.\n\n${company.name} can help through ${company.offer}. The proposed next step is to ${company.primary_cta.toLowerCase()} so we can confirm fit and define the most useful direction.\n\nIf any part of the approach is still unclear, reply with the question you would like us to address.\n\nBest,\n${company.name}`,
        1_500
      ),
      directMessage: fitText(
        `Thanks for the conversation. The clearest next step is to ${company.primary_cta.toLowerCase()} so we can confirm fit and the right direction. Send me the remaining question if there is anything you want to clarify first.`,
        500
      )
    }
  });
}

export async function generateSalesPitch(
  input: SalesPitchInput
): Promise<{ pitch: SalesPitch; model: string; mocked: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    return {
      pitch: createMockSalesPitch(input),
      model: "campaignova-sales-pitch-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: SALES_PITCH_INSTRUCTIONS,
    input: JSON.stringify({
      company: { ...input.company, language: "English" },
      approvedStrategy: input.strategy,
      approvedLandingPage: {
        hero: input.landingPage.hero,
        problem: input.landingPage.problem,
        solution: input.landingPage.solution,
        offer: input.landingPage.offer,
        trust: input.landingPage.trust,
        finalCallToAction: input.landingPage.finalCallToAction
      },
      outputLanguage: "English",
      version: input.version
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(salesPitchSchema, "sales_pitch"),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-sales-pitch-english-v1"
  });

  if (!response.output_parsed) {
    throw new Error("Sales pitch generation returned no structured output.");
  }

  return {
    pitch: salesPitchSchema.parse({
      ...response.output_parsed,
      version: input.version
    }),
    model,
    mocked: false
  };
}
