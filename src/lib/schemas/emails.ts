import { z } from "zod";

export const emailRoleSchema = z.enum([
  "Problem awareness",
  "Education",
  "Trust",
  "Offer",
  "Final call"
]);

export const emailContentSchema = z.object({
  internalName: z.string().min(5).max(120),
  subjectLine: z.string().min(5).max(120),
  alternateSubjectLine: z.string().min(5).max(120),
  previewText: z.string().min(10).max(180),
  body: z.string().min(120).max(5_000),
  callToAction: z.string().min(5).max(220),
  postscript: z.string().min(10).max(500).nullable()
});

export const generatedEmailSchema = emailContentSchema.extend({
  sequenceNumber: z.number().int().min(1).max(5),
  sendDay: z.number().int().min(1).max(30),
  role: emailRoleSchema
});

export const generatedEmailCampaignSchema = z.object({
  version: z.number().int().positive(),
  campaignName: z.string().min(10).max(180),
  emails: z.array(generatedEmailSchema).length(5)
});

export type GeneratedEmail = z.infer<typeof generatedEmailSchema>;
export type GeneratedEmailCampaign = z.infer<
  typeof generatedEmailCampaignSchema
>;
