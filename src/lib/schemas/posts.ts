import { z } from "zod";

export const generatedPostDraftSchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  headline: z.string().min(5).max(180),
  body: z.string().min(40).max(2_500),
  caption: z.string().min(30).max(2_200),
  callToAction: z.string().min(5).max(220),
  hashtags: z.array(z.string().regex(/^#[^\s#]+$/)).max(8),
  visualBrief: z.string().min(20).max(500),
  videoScript: z
    .object({
      hook: z.string().min(5).max(220),
      spokenScript: z.string().min(30).max(1_500),
      onScreenText: z.array(z.string().min(2).max(120)).min(2).max(6),
      shotList: z.array(z.string().min(5).max(220)).min(2).max(8)
    })
    .nullable()
});

export const generatedPostSchema = generatedPostDraftSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.string().min(2).max(80),
  format: z.string().min(2).max(80),
  contentPillar: z.string().min(2).max(100)
});

export const postBatchSchema = z.object({
  posts: z.array(generatedPostDraftSchema).length(10)
});

export const generatedPostsSchema = z.object({
  version: z.number().int().positive(),
  posts: z.array(generatedPostSchema).length(30)
});

export type GeneratedPost = z.infer<typeof generatedPostSchema>;
export type GeneratedPosts = z.infer<typeof generatedPostsSchema>;
