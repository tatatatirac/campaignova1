import { z } from "zod";

const nonNegativeInteger = z.number().int().min(0).max(1_000_000_000);
const nonNegativeMoney = z.number().min(0).max(1_000_000_000);

export const kpiInputSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  spend: nonNegativeMoney,
  revenue: nonNegativeMoney,
  impressions: nonNegativeInteger,
  clicks: nonNegativeInteger,
  landingPageVisits: nonNegativeInteger,
  leads: nonNegativeInteger,
  qualifiedLeads: nonNegativeInteger,
  bookedCalls: nonNegativeInteger,
  sales: nonNegativeInteger,
  emailReplies: nonNegativeInteger,
  postsPublished: z.number().int().min(0).max(30),
  videosPublished: z.number().int().min(0).max(30)
});

export const kpiTargetsSchema = z.object({
  qualifiedLeads: nonNegativeInteger,
  bookedCalls: nonNegativeInteger,
  sales: nonNegativeInteger,
  revenue: nonNegativeMoney
});

const percentage = z.number().min(0).max(100_000).nullable();
const moneyMetric = z.number().min(0).max(1_000_000_000).nullable();

export const kpiComputedSchema = z.object({
  clickThroughRate: percentage,
  landingPageConversionRate: percentage,
  leadQualificationRate: percentage,
  leadToCallRate: percentage,
  callToSaleRate: percentage,
  costPerLead: moneyMetric,
  customerAcquisitionCost: moneyMetric,
  returnOnAdSpend: z.number().min(0).max(100_000).nullable(),
  contentExecutionRate: percentage,
  targetAttainmentRate: percentage,
  dataCompletenessRate: percentage
});

export const executionReviewSchema = z.object({
  status: z.enum([
    "Insufficient data",
    "Needs attention",
    "On track",
    "Strong performance"
  ]),
  score: z.number().int().min(0).max(100),
  executiveSummary: z.string().min(80).max(900),
  wins: z.array(z.string().min(15).max(300)).length(3),
  risks: z.array(z.string().min(15).max(300)).length(3),
  nextActions: z.array(z.string().min(15).max(300)).length(3),
  stop: z.string().min(20).max(400),
  start: z.string().min(20).max(400),
  continue: z.string().min(20).max(400),
  budgetRecommendation: z.string().min(30).max(600)
});

export const kpiExecutionReviewSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.string().datetime({ offset: true }),
  inputs: kpiInputSchema,
  targets: kpiTargetsSchema,
  computed: kpiComputedSchema,
  review: executionReviewSchema
});

export type KpiInput = z.infer<typeof kpiInputSchema>;
export type KpiTargets = z.infer<typeof kpiTargetsSchema>;
export type KpiComputed = z.infer<typeof kpiComputedSchema>;
export type ExecutionReview = z.infer<typeof executionReviewSchema>;
export type KpiExecutionReview = z.infer<typeof kpiExecutionReviewSchema>;
