import { z } from "zod";

export const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(120),
  offer: z.string().trim().min(20).max(2_000),
  priceContext: z.string().trim().max(200).optional(),
  audience: z.string().trim().min(20).max(2_000),
  location: z.string().trim().min(2).max(160),
  language: z.literal("English"),
  tone: z.string().trim().min(2).max(120),
  primaryGoal: z.string().trim().min(2).max(160),
  primaryCta: z.string().trim().min(2).max(200),
  timezone: z.string().trim().min(3).max(80),
  websiteUrl: z.url().optional(),
  competitors: z.array(z.string().trim().max(240)).max(10).default([]),
  monthlyBudget: z.number().nonnegative().max(10_000_000).optional(),
  differentiator: z.string().trim().max(2_000).optional(),
  activeChannels: z.array(z.string().trim().max(80)).max(20).default([])
});

export type CompanyInput = z.infer<typeof companySchema>;
