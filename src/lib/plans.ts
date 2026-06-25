export const PLAN_LIMITS = {
  starter: {
    brands: 1,
    monthlyPlans: 1,
    videos: 1,
    aiRequests: 12,
    regenerations: 5
  },
  growth: {
    brands: 1,
    monthlyPlans: 2,
    videos: 5,
    aiRequests: 34,
    regenerations: 20
  },
  director: {
    brands: 3,
    monthlyPlans: 5,
    videos: 30,
    aiRequests: 95,
    regenerations: 60
  }
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;
