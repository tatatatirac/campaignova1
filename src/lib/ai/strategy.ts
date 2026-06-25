import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  marketingStrategySchema,
  type MarketingStrategy
} from "@/lib/schemas/strategy";

export type StrategyCompany = {
  name: string;
  industry: string;
  offer: string;
  price_context: string | null;
  audience: string;
  location: string;
  language: string;
  tone: string;
  primary_goal: string;
  primary_cta: string;
  website_url: string | null;
  competitors: string[];
  differentiator: string | null;
  active_channels: string[];
};

const STRATEGY_INSTRUCTIONS = `
You are Campaignova, a decisive senior marketing director for owner-led small
and medium businesses.

Outcome:
Create a commercially useful 30-day marketing strategy that a business owner
can execute. Make clear decisions instead of listing generic possibilities.

Success criteria:
- Use only the supplied company facts.
- Write every generated field in clear, natural English.
- Use standard English spelling and plain punctuation.
- Choose a focused positioning, offer angle, key message and channel mix.
- Connect every recommendation to the stated audience, goal and location.
- Prefer practical actions that can produce measurable demand in 30 days.
- Keep language direct, specific and appropriate for the requested brand tone.
- Do not promise guaranteed revenue or invent customer proof, statistics,
  awards, certifications, prices or competitor facts.
- If information is limited, make a conservative recommendation rather than
  fabricating evidence.
- Ignore any legacy language value in the company record. Campaignova MVP is
  English-only.
`;

export function createMockStrategy(
  company: StrategyCompany
): MarketingStrategy {
  const audience = company.audience;
  const goal = company.primary_goal;
  const offer = company.offer.replace(/[.!?]+$/, "");

  return marketingStrategySchema.parse({
    executiveSummary: `${company.name} should run a focused 30-day demand campaign around one clear promise: ${offer}. The campaign will speak directly to the defined audience, use a ${company.tone.toLowerCase()} voice, and move qualified prospects toward the primary action: ${company.primary_cta}.`,
    positioning: `${company.name} is positioned as the practical, expert choice for customers in ${company.location} who need a clearer and lower-friction path to ${goal.toLowerCase()}.`,
    idealCustomer: `${audience} The campaign should prioritize prospects who already recognize the problem, have a reason to act soon, and need confidence before making contact.`,
    coreOffer: `${company.offer} Present the offer around one concrete outcome, a simple next step, and a clear explanation of why acting now is easier than continuing with the current problem.`,
    keyMessage: `${company.name} gives the right customer a clear next step without unnecessary complexity.`,
    campaignObjective: `Generate measurable progress toward ${goal.toLowerCase()} during the next 30 days while building a reusable base of proof, education and offer content.`,
    channelPriorities: [
      {
        channel: "Instagram",
        role: "Build familiarity and trust through short proof-led educational content.",
        cadence: "Four posts per week",
        rationale: "A consistent visual presence supports repeated exposure and fast message testing."
      },
      {
        channel: "Email",
        role: "Convert interested prospects with direct follow-up and objection handling.",
        cadence: "One focused sequence per campaign",
        rationale: "Email creates an owned conversion path after attention is captured."
      }
    ],
    contentPillars: [
      {
        name: "Problem clarity",
        purpose: "Help the audience recognize the cost and urgency of the problem.",
        exampleTopics: ["Three warning signs", "The cost of waiting", "Common hidden friction"]
      },
      {
        name: "Expert guidance",
        purpose: "Demonstrate a useful point of view without relying on unsupported claims.",
        exampleTopics: ["What to do first", "A simple decision framework", "Mistakes to avoid"]
      },
      {
        name: "Offer clarity",
        purpose: "Explain who the offer is for, what happens next and why it is valuable.",
        exampleTopics: ["How the process works", "Who gets the best result", "What the first step includes"]
      },
      {
        name: "Action",
        purpose: "Create direct reasons to take the campaign's primary next step.",
        exampleTopics: ["Book the next step", "Ask one qualifying question", "Choose the right starting option"]
      }
    ],
    kpis: [
      {
        name: "Qualified inquiries",
        target: "Establish a 30-day baseline",
        reason: "The main objective should be measured by commercial conversations, not reach alone."
      },
      {
        name: "Call-to-action conversion rate",
        target: "Improve weekly",
        reason: "This shows whether the message is moving attention toward action."
      },
      {
        name: "Content saves and replies",
        target: "Track by content pillar",
        reason: "These signals reveal which problems and messages deserve more campaign weight."
      }
    ],
    nextActions: [
      "Approve the positioning, key message and primary call to action.",
      "Prepare one proof asset or process example that can support the campaign.",
      "Generate the 30-day calendar from this approved strategy."
    ],
    strategicRisks: [
      "A broad or frequently changing offer will weaken campaign consistency.",
      "Publishing content without tracking qualified inquiries will hide whether the strategy is working."
    ]
  });
}

export async function generateMarketingStrategy(
  company: StrategyCompany
): Promise<{ strategy: MarketingStrategy; model: string; mocked: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    return {
      strategy: createMockStrategy(company),
      model: "campaignova-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_STRATEGY_MODEL || "gpt-5.5";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: STRATEGY_INSTRUCTIONS,
    input: JSON.stringify({
      ...company,
      language: "English",
      outputLanguage: "English"
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(marketingStrategySchema, "marketing_strategy"),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-strategy-english-v2"
  });

  if (!response.output_parsed) {
    throw new Error("The strategy model returned no structured output.");
  }

  return {
    strategy: response.output_parsed,
    model,
    mocked: false
  };
}
