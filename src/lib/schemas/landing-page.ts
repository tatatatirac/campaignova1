import { z } from "zod";

const benefitSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(20).max(400)
});

const processStepSchema = z.object({
  title: z.string().min(3).max(80),
  description: z.string().min(20).max(350)
});

const faqItemSchema = z.object({
  question: z.string().min(10).max(180),
  answer: z.string().min(30).max(700)
});

export const landingPageSchema = z.object({
  version: z.number().int().positive(),
  pageName: z.string().min(5).max(140),
  seo: z.object({
    title: z.string().min(10).max(70),
    description: z.string().min(50).max(180)
  }),
  hero: z.object({
    eyebrow: z.string().min(3).max(80),
    headline: z.string().min(10).max(140),
    subheadline: z.string().min(40).max(450),
    primaryCallToAction: z.string().min(3).max(100),
    secondaryCallToAction: z.string().min(3).max(100).nullable()
  }),
  problem: z.object({
    headline: z.string().min(10).max(140),
    body: z.string().min(80).max(800),
    painPoints: z.array(z.string().min(10).max(220)).length(3)
  }),
  solution: z.object({
    headline: z.string().min(10).max(140),
    body: z.string().min(80).max(800)
  }),
  benefits: z.object({
    headline: z.string().min(10).max(140),
    introduction: z.string().min(30).max(400),
    items: z.array(benefitSchema).length(3)
  }),
  process: z.object({
    headline: z.string().min(10).max(140),
    introduction: z.string().min(30).max(400),
    steps: z.array(processStepSchema).length(3)
  }),
  offer: z.object({
    headline: z.string().min(10).max(140),
    body: z.string().min(80).max(800),
    inclusions: z.array(z.string().min(10).max(220)).length(3),
    callToAction: z.string().min(3).max(100)
  }),
  trust: z.object({
    headline: z.string().min(10).max(140),
    body: z.string().min(60).max(700),
    reasons: z.array(benefitSchema).length(3)
  }),
  faq: z.object({
    headline: z.string().min(10).max(140),
    items: z.array(faqItemSchema).length(5)
  }),
  finalCallToAction: z.object({
    headline: z.string().min(10).max(140),
    body: z.string().min(40).max(500),
    callToAction: z.string().min(3).max(100)
  })
});

export type LandingPage = z.infer<typeof landingPageSchema>;
