import { z } from "zod";

export const calendarItemSchema = z.object({
  dayNumber: z.number().int().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.enum([
    "Instagram",
    "TikTok",
    "YouTube Shorts",
    "LinkedIn",
    "Email",
    "Google Business Profile"
  ]),
  format: z.enum([
    "Reel",
    "Short video",
    "Carousel",
    "Static post",
    "Story sequence",
    "Email",
    "Text post"
  ]),
  contentPillar: z.string().min(2).max(100),
  objective: z.string().min(10).max(220),
  topic: z.string().min(10).max(220),
  hook: z.string().min(10).max(240),
  angle: z.string().min(10).max(300),
  callToAction: z.string().min(5).max(180),
  publishTimeLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timingRationale: z.string().min(10).max(220),
  videoTheme: z.string().min(10).max(220).nullable()
});

export const contentCalendarSchema = z.object({
  monthlyTheme: z.string().min(10).max(220),
  campaignNarrative: z.string().min(40).max(600),
  timezone: z.string().min(3).max(80),
  weeklyObjectives: z
    .array(
      z.object({
        week: z.number().int().min(1).max(5),
        days: z.string().min(3).max(40),
        objective: z.string().min(20).max(240)
      })
    )
    .length(5),
  items: z.array(calendarItemSchema).length(30)
});

export type ContentCalendar = z.infer<typeof contentCalendarSchema>;

