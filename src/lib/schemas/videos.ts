import { z } from "zod";

export const videoReleaseStatusSchema = z.enum([
  "scheduled",
  "available",
  "downloaded",
  "published"
]);

export const videoReleaseViewSchema = z.object({
  id: z.uuid(),
  assetId: z.uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  durationSeconds: z.number().int().positive(),
  platform: z.string().min(1).max(80),
  caption: z.string().min(1).max(5_000),
  callToAction: z.string().min(1).max(500),
  releaseAt: z.string().datetime({ offset: true }),
  publishAt: z.string().datetime({ offset: true }),
  status: videoReleaseStatusSchema,
  isAvailable: z.boolean(),
  unlockedEarly: z.boolean(),
  previewUrl: z.url().nullable(),
  thumbnailUrl: z.url().nullable(),
  downloadedAt: z.string().datetime({ offset: true }).nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable()
});

export const videoLibraryResponseSchema = z.object({
  plan: z.enum(["starter", "growth", "director"]),
  entitlement: z.number().int().min(1).max(30),
  timezone: z.string().min(1).max(100),
  assignedCount: z.number().int().min(0).max(30),
  releases: z.array(videoReleaseViewSchema).max(30)
});

export type VideoReleaseView = z.infer<typeof videoReleaseViewSchema>;
export type VideoLibraryResponse = z.infer<typeof videoLibraryResponseSchema>;
