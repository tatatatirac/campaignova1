import { z } from "zod";

export const marketingStrategySchema = z.object({
  executiveSummary: z.string().min(80).max(800),
  positioning: z.string().min(40).max(500),
  idealCustomer: z.string().min(40).max(500),
  coreOffer: z.string().min(40).max(500),
  keyMessage: z.string().min(20).max(240),
  campaignObjective: z.string().min(30).max(300),
  channelPriorities: z
    .array(
      z.object({
        channel: z.string().min(2).max(80),
        role: z.string().min(20).max(240),
        cadence: z.string().min(5).max(120),
        rationale: z.string().min(20).max(300)
      })
    )
    .min(2)
    .max(4),
  contentPillars: z
    .array(
      z.object({
        name: z.string().min(2).max(80),
        purpose: z.string().min(20).max(240),
        exampleTopics: z.array(z.string().min(5).max(160)).length(3)
      })
    )
    .length(4),
  kpis: z
    .array(
      z.object({
        name: z.string().min(2).max(100),
        target: z.string().min(2).max(120),
        reason: z.string().min(10).max(220)
      })
    )
    .length(3),
  nextActions: z.array(z.string().min(10).max(220)).length(3),
  strategicRisks: z.array(z.string().min(10).max(220)).length(2)
});

export type MarketingStrategy = z.infer<typeof marketingStrategySchema>;

