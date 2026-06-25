import { z } from "zod";

const objectionSchema = z.object({
  objection: z.string().min(5).max(180),
  response: z.string().min(40).max(700),
  bridgeQuestion: z.string().min(10).max(220)
});

export const salesPitchSchema = z.object({
  version: z.number().int().positive(),
  pitchName: z.string().min(5).max(140),
  audienceSnapshot: z.object({
    problem: z.string().min(30).max(500),
    desiredOutcome: z.string().min(30).max(500),
    buyingTrigger: z.string().min(20).max(350)
  }),
  elevatorPitch: z.string().min(80).max(800),
  conversationPitch: z.object({
    opener: z.string().min(40).max(500),
    discoveryQuestions: z.array(z.string().min(10).max(220)).length(5),
    transition: z.string().min(30).max(500),
    offerPresentation: z.string().min(100).max(1_200),
    differentiator: z.string().min(40).max(600),
    callToAction: z.string().min(10).max(220)
  }),
  objections: z.array(objectionSchema).length(5),
  closing: z.object({
    summary: z.string().min(40).max(600),
    directClose: z.string().min(20).max(350),
    lowPressureClose: z.string().min(20).max(350)
  }),
  followUp: z.object({
    emailSubject: z.string().min(5).max(120),
    emailBody: z.string().min(100).max(1_500),
    directMessage: z.string().min(40).max(500)
  })
});

export type SalesPitch = z.infer<typeof salesPitchSchema>;
