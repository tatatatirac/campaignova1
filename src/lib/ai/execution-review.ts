import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { StrategyCompany } from "@/lib/ai/strategy";
import {
  executionReviewSchema,
  type ExecutionReview,
  type KpiComputed,
  type KpiInput,
  type KpiTargets
} from "@/lib/schemas/kpis";
import type { MarketingStrategy } from "@/lib/schemas/strategy";

const REVIEW_INSTRUCTIONS = `
You are Campaignova's senior marketing director reviewing a completed campaign.

Use only the supplied business facts, approved strategy, verified campaign
metrics and mathematically computed rates. Produce a concise operational review
that helps the owner decide what to stop, start and continue next month.

Rules:
- Write every field in clear, natural English.
- Use standard English spelling and plain punctuation.
- Never alter, reinterpret or invent the supplied numbers.
- The only commercial targets are qualified leads, booked calls, sales and
  revenue. Never compare total leads with the qualified-lead target.
- Use the supplied execution plan when judging content volume. Publishing the
  full included video allocation is not an execution gap.
- Distinguish execution problems from conversion problems.
- If data is sparse, say so directly and prioritize measurement fixes.
- Wins must be supported by the supplied results.
- Risks must identify the most consequential gaps, not generic concerns.
- Next actions must be specific enough to execute in the next 30 days.
- Never include questions, notes to yourself, draft fragments or requests to
  verify the supplied numbers.
- Do not promise revenue, guarantee outcomes or claim statistical certainty.
- Do not recommend increasing spend when there is no reliable conversion or
  revenue evidence.
- Preserve the supplied status and score exactly.
- Ignore any legacy language value. Campaignova MVP is English-only.
`;

type ReviewInput = {
  company: StrategyCompany;
  strategy: MarketingStrategy;
  inputs: KpiInput;
  targets: KpiTargets;
  computed: KpiComputed;
  status: ExecutionReview["status"];
  score: number;
  videoEntitlement: number;
};

function metricSummary(computed: KpiComputed) {
  return `Execution is ${computed.contentExecutionRate ?? 0}% and target attainment is ${computed.targetAttainmentRate ?? 0}%.`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function createVerifiedWins(input: ReviewInput): [string, string, string] {
  if ((input.computed.dataCompletenessRate ?? 0) < 20) {
    return [
      "The campaign now has a defined measurement period for a repeatable monthly review.",
      "The qualified-lead, booked-call, sales and revenue targets are recorded separately.",
      "The funnel stages are defined from traffic through leads, calls, sales and attributed revenue."
    ];
  }

  const qualifiedLeadWin =
    input.targets.qualifiedLeads > 0
      ? `${input.inputs.qualifiedLeads} qualified leads were recorded against a target of ${input.targets.qualifiedLeads}.`
      : `${input.inputs.qualifiedLeads} qualified leads were recorded during the review period.`;
  const commercialWin =
    input.targets.sales > 0 || input.targets.revenue > 0
      ? `${input.inputs.sales} sales were recorded${
          input.targets.sales > 0
            ? ` against a target of ${input.targets.sales}`
            : ""
        }, with ${formatMoney(input.inputs.revenue)} in attributed revenue${
          input.targets.revenue > 0
            ? ` against a target of ${formatMoney(input.targets.revenue)}`
            : ""
        }.`
      : `${input.inputs.bookedCalls} booked calls and ${input.inputs.sales} sales were recorded during the review period.`;

  return [
    `${input.inputs.postsPublished} of 30 planned posts and ${input.inputs.videosPublished} of ${input.videoEntitlement} included videos were published, producing ${input.computed.contentExecutionRate ?? 0}% content execution.`,
    qualifiedLeadWin,
    commercialWin
  ];
}

function containsDraftFragment(value: string) {
  return (
    value.includes("?") ||
    value.includes("','") ||
    value.includes('","') ||
    /\b(wait|need exact|check (the )?numbers|note to self)\b/i.test(value)
  );
}

function guardReview(
  review: ExecutionReview,
  fallback: ExecutionReview,
  input: ReviewInput
): ExecutionReview {
  const safeText = (value: string, fallbackValue: string) =>
    containsDraftFragment(value) ? fallbackValue : value;
  const safeList = (values: string[], fallbackValues: string[]) =>
    values.map((value, index) =>
      containsDraftFragment(value) ? fallbackValues[index] : value
    ) as [string, string, string];

  return executionReviewSchema.parse({
    ...review,
    status: input.status,
    score: input.score,
    executiveSummary: safeText(
      review.executiveSummary,
      fallback.executiveSummary
    ),
    wins: createVerifiedWins(input),
    risks: safeList(review.risks, fallback.risks),
    nextActions: safeList(review.nextActions, fallback.nextActions),
    stop: safeText(review.stop, fallback.stop),
    start: safeText(review.start, fallback.start),
    continue: safeText(review.continue, fallback.continue),
    budgetRecommendation: safeText(
      review.budgetRecommendation,
      fallback.budgetRecommendation
    )
  });
}

function createMockReview(input: ReviewInput): ExecutionReview {
  const sparse = (input.computed.dataCompletenessRate ?? 0) < 20;

  return executionReviewSchema.parse({
    status: input.status,
    score: input.score,
    executiveSummary: sparse
      ? `${input.company.name} does not yet have enough recorded campaign data for a reliable performance judgment. The immediate priority is to complete execution tracking and record each step from traffic through qualified leads, booked calls, sales and revenue before changing the strategy.`
      : `${input.company.name} completed a measurable campaign review. ${metricSummary(input.computed)} The next month should preserve the strongest executed activity, fix the largest funnel gap and make budget decisions only from verified lead and revenue evidence.`,
    wins: createVerifiedWins(input),
    risks: [
      sparse
        ? "Too few fields contain real results, so conversion conclusions would be premature."
        : "Any untracked traffic source or offline lead can distort the calculated conversion rates.",
      input.inputs.leads > 0 && input.inputs.qualifiedLeads === 0
        ? "Leads are entering the funnel but none are recorded as qualified."
        : "Lead quality must be reviewed separately from lead volume.",
      input.inputs.spend > 0 && input.inputs.sales === 0
        ? "Campaign spend has not yet produced a recorded sale."
        : "Budget changes made before attribution is complete could hide what is actually working."
    ],
    nextActions: [
      "Record results weekly using the same funnel definitions and source labels.",
      "Review the lowest conversion stage and test one focused message or process change.",
      "Carry the best-performing topic and call to action into the next 30-day plan."
    ],
    stop:
      "Stop changing multiple campaign variables at once because it prevents a clear comparison between months.",
    start:
      "Start a weekly fifteen-minute KPI review that confirms execution, funnel movement and attribution quality.",
    continue:
      "Continue using one primary offer and call to action so campaign performance remains comparable.",
    budgetRecommendation:
      input.inputs.spend > 0 &&
      input.inputs.sales > 0 &&
      input.inputs.revenue >= input.inputs.spend
        ? "Maintain the current budget while validating that the recorded sales and revenue remain attributable across another review period. Increase only after the result repeats."
        : "Do not increase the budget yet. First improve execution consistency, conversion tracking and evidence that qualified leads or revenue are attributable to the campaign."
  });
}

export async function generateExecutionReview(
  input: ReviewInput
): Promise<{ review: ExecutionReview; model: string; mocked: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    return {
      review: createMockReview(input),
      model: "campaignova-execution-review-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: REVIEW_INSTRUCTIONS,
    input: JSON.stringify({
      company: { ...input.company, language: "English" },
      approvedStrategy: input.strategy,
      verifiedInputs: input.inputs,
      userTargets: input.targets,
      calculatedMetrics: input.computed,
      executionPlan: {
        plannedPosts: 30,
        includedVideos: input.videoEntitlement
      },
      requiredStatus: input.status,
      requiredScore: input.score,
      outputLanguage: "English"
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(executionReviewSchema, "execution_review"),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-execution-review-english-v1"
  });

  if (!response.output_parsed) {
    throw new Error("Execution review returned no structured output.");
  }

  const fallback = createMockReview(input);

  return {
    review: guardReview(response.output_parsed, fallback, input),
    model,
    mocked: false
  };
}
