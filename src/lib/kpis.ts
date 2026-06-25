import type {
  KpiComputed,
  KpiInput,
  KpiTargets
} from "@/lib/schemas/kpis";

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

function moneyPer(outcome: number, spend: number) {
  return outcome > 0 ? spend / outcome : null;
}

function round(value: number | null, precision = 2) {
  if (value === null) {
    return null;
  }

  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

export function calculateKpis(
  inputs: KpiInput,
  targets: KpiTargets,
  videoEntitlement: number
): KpiComputed {
  const targetProgress = [
    targets.qualifiedLeads > 0
      ? Math.min(100, rate(inputs.qualifiedLeads, targets.qualifiedLeads) ?? 0)
      : null,
    targets.bookedCalls > 0
      ? Math.min(100, rate(inputs.bookedCalls, targets.bookedCalls) ?? 0)
      : null,
    targets.sales > 0
      ? Math.min(100, rate(inputs.sales, targets.sales) ?? 0)
      : null,
    targets.revenue > 0
      ? Math.min(100, rate(inputs.revenue, targets.revenue) ?? 0)
      : null
  ].filter((value): value is number => value !== null);
  const meaningfulFields = [
    inputs.spend,
    inputs.revenue,
    inputs.impressions,
    inputs.clicks,
    inputs.landingPageVisits,
    inputs.leads,
    inputs.qualifiedLeads,
    inputs.bookedCalls,
    inputs.sales,
    inputs.emailReplies,
    inputs.postsPublished,
    inputs.videosPublished
  ];

  return {
    clickThroughRate: round(rate(inputs.clicks, inputs.impressions)),
    landingPageConversionRate: round(
      rate(inputs.leads, inputs.landingPageVisits)
    ),
    leadQualificationRate: round(
      rate(inputs.qualifiedLeads, inputs.leads)
    ),
    leadToCallRate: round(rate(inputs.bookedCalls, inputs.qualifiedLeads)),
    callToSaleRate: round(rate(inputs.sales, inputs.bookedCalls)),
    costPerLead: round(moneyPer(inputs.leads, inputs.spend)),
    customerAcquisitionCost: round(moneyPer(inputs.sales, inputs.spend)),
    returnOnAdSpend:
      inputs.spend > 0 ? round(inputs.revenue / inputs.spend) : null,
    contentExecutionRate: round(
      Math.min(
        100,
        ((inputs.postsPublished + inputs.videosPublished) /
          (30 + videoEntitlement)) *
          100
      )
    ),
    targetAttainmentRate:
      targetProgress.length > 0
        ? round(
            targetProgress.reduce((total, value) => total + value, 0) /
              targetProgress.length
          )
        : null,
    dataCompletenessRate: round(
      (meaningfulFields.filter((value) => value > 0).length /
        meaningfulFields.length) *
        100
    )
  };
}

export function calculateExecutionScore(computed: KpiComputed) {
  const execution = computed.contentExecutionRate ?? 0;
  const attainment = computed.targetAttainmentRate;
  const completeness = computed.dataCompletenessRate ?? 0;

  if (completeness < 20) {
    return Math.round(Math.min(35, completeness));
  }

  if (attainment === null) {
    return Math.round(execution * 0.7 + completeness * 0.3);
  }

  return Math.round(execution * 0.4 + attainment * 0.5 + completeness * 0.1);
}
