"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Check,
  Clipboard,
  Gauge,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  Target
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  kpiExecutionReviewSchema,
  type KpiExecutionReview,
  type KpiInput,
  type KpiTargets
} from "@/lib/schemas/kpis";

type ExecutionReviewPanelProps = {
  planId: string | null;
  videosReady: boolean;
  videoEntitlement: number;
  initialReview: KpiExecutionReview | null;
  month: string;
};

const inputFields: Array<{
  key: keyof Omit<KpiInput, "periodStart" | "periodEnd">;
  label: string;
  prefix?: string;
}> = [
  { key: "spend", label: "Campaign spend", prefix: "$" },
  { key: "revenue", label: "Attributed revenue", prefix: "$" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "landingPageVisits", label: "Landing page visits" },
  { key: "leads", label: "Leads" },
  { key: "qualifiedLeads", label: "Qualified leads" },
  { key: "bookedCalls", label: "Booked calls" },
  { key: "sales", label: "Sales" },
  { key: "emailReplies", label: "Email replies" },
  { key: "postsPublished", label: "Posts published" },
  { key: "videosPublished", label: "Videos published" }
];

const targetFields: Array<{
  key: keyof KpiTargets;
  label: string;
  prefix?: string;
}> = [
  { key: "qualifiedLeads", label: "Qualified lead target" },
  { key: "bookedCalls", label: "Booked call target" },
  { key: "sales", label: "Sales target" },
  { key: "revenue", label: "Revenue target", prefix: "$" }
];

function monthDates(month: string) {
  const start = month.slice(0, 10);
  const date = new Date(`${start}T00:00:00Z`);
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  );

  return { start, end: end.toISOString().slice(0, 10) };
}

function emptyInputs(month: string): KpiInput {
  const dates = monthDates(month);

  return {
    periodStart: dates.start,
    periodEnd: dates.end,
    spend: 0,
    revenue: 0,
    impressions: 0,
    clicks: 0,
    landingPageVisits: 0,
    leads: 0,
    qualifiedLeads: 0,
    bookedCalls: 0,
    sales: 0,
    emailReplies: 0,
    postsPublished: 0,
    videosPublished: 0
  };
}

const emptyTargets: KpiTargets = {
  qualifiedLeads: 10,
  bookedCalls: 5,
  sales: 1,
  revenue: 0
};

function percentage(value: number | null) {
  return value === null ? "Not enough data" : `${value.toFixed(1)}%`;
}

function money(value: number | null) {
  return value === null
    ? "Not enough data"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }).format(value);
}

export function ExecutionReviewPanel({
  planId,
  videosReady,
  videoEntitlement,
  initialReview,
  month
}: ExecutionReviewPanelProps) {
  const router = useRouter();
  const [review, setReview] = useState(initialReview);
  const [inputs, setInputs] = useState<KpiInput>(
    initialReview?.inputs ?? emptyInputs(month)
  );
  const [targets, setTargets] = useState<KpiTargets>(
    initialReview?.targets ?? emptyTargets
  );
  const [editing, setEditing] = useState(!initialReview);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metricCards = useMemo(
    () =>
      review
        ? [
            ["Content execution", percentage(review.computed.contentExecutionRate)],
            ["Target attainment", percentage(review.computed.targetAttainmentRate)],
            ["Landing conversion", percentage(review.computed.landingPageConversionRate)],
            ["Qualified lead rate", percentage(review.computed.leadQualificationRate)],
            ["Cost per lead", money(review.computed.costPerLead)],
            [
              "ROAS",
              review.computed.returnOnAdSpend === null
                ? "Not enough data"
                : `${review.computed.returnOnAdSpend.toFixed(2)}x`
            ]
          ]
        : [],
    [review]
  );

  if (!videosReady || !planId) {
    return null;
  }

  async function generateReview() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plans/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, inputs, targets })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Execution review failed.");
      }

      const parsed = kpiExecutionReviewSchema.parse(payload.review);
      setReview(parsed);
      setInputs(parsed.inputs);
      setTargets(parsed.targets);
      setEditing(false);
      router.refresh();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Execution review failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyReview() {
    if (!review) {
      return;
    }

    await navigator.clipboard.writeText(
      [
        `${review.review.status} - ${review.review.score}/100`,
        review.review.executiveSummary,
        "WINS",
        ...review.review.wins.map((item) => `- ${item}`),
        "RISKS",
        ...review.review.risks.map((item) => `- ${item}`),
        "NEXT ACTIONS",
        ...review.review.nextActions.map((item) => `- ${item}`),
        `STOP: ${review.review.stop}`,
        `START: ${review.review.start}`,
        `CONTINUE: ${review.review.continue}`,
        `BUDGET: ${review.review.budgetRecommendation}`
      ].join("\n\n")
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  return (
    <article className="card mt-4 p-4 sm:p-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
            <BarChart3 size={15} />
            KPI and execution review
          </div>
          <h3 className="display mt-3 max-w-3xl text-4xl leading-none">
            Turn campaign activity into the next decision.
          </h3>
          <p className="mt-3 max-w-2xl text-xs font-bold leading-5 text-[#777c75]">
            Enter verified results. Campaignova calculates the funnel and tells
            you what to stop, start and continue.
          </p>
        </div>
        {review && !editing && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyReview}
              className="button-secondary !min-h-10 !px-4 !text-xs"
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
              {copied ? "Copied" : "Copy review"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="button-secondary !min-h-10 !px-4 !text-xs"
            >
              <RefreshCw size={14} />
              Update results
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {editing ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
          <div className="rounded-3xl bg-[#f1efe8] p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  Actual results
                </p>
                <p className="mt-1 text-xs text-[#656a64]">
                  Use the same attribution rules every month.
                </p>
              </div>
              <Gauge size={20} className="text-[#695cff]" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  Period start
                </span>
                <input
                  type="date"
                  value={inputs.periodStart}
                  onChange={(event) =>
                    setInputs((current) => ({
                      ...current,
                      periodStart: event.target.value
                    }))
                  }
                  className="field"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  Period end
                </span>
                <input
                  type="date"
                  value={inputs.periodEnd}
                  onChange={(event) =>
                    setInputs((current) => ({
                      ...current,
                      periodEnd: event.target.value
                    }))
                  }
                  className="field"
                />
              </label>
              {inputFields.map((field) => (
                <label key={field.key} className="grid gap-2">
                  <span className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                    {field.label}
                  </span>
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#777c75]">
                        {field.prefix}
                      </span>
                    )}
                    <input
                      type="number"
                      min="0"
                      max={
                        field.key === "postsPublished"
                          ? 30
                          : field.key === "videosPublished"
                            ? videoEntitlement
                            : undefined
                      }
                      step={
                        field.key === "spend" || field.key === "revenue"
                          ? "0.01"
                          : "1"
                      }
                      value={inputs[field.key]}
                      onChange={(event) =>
                        setInputs((current) => ({
                          ...current,
                          [field.key]: Number(event.target.value)
                        }))
                      }
                      className={`field ${field.prefix ? "!pl-8" : ""}`}
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-[#171817] p-4 text-white sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#d9ff43] uppercase">
                  Commercial targets
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Set zero to exclude a target.
                </p>
              </div>
              <Target size={20} />
            </div>
            <div className="mt-5 grid gap-3">
              {targetFields.map((field) => (
                <label key={field.key} className="grid gap-2">
                  <span className="text-[10px] font-black tracking-wider text-white/45 uppercase">
                    {field.label}
                  </span>
                  <div className="relative">
                    {field.prefix && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-white/40">
                        {field.prefix}
                      </span>
                    )}
                    <input
                      type="number"
                      min="0"
                      step={field.key === "revenue" ? "0.01" : "1"}
                      value={targets[field.key]}
                      onChange={(event) =>
                        setTargets((current) => ({
                          ...current,
                          [field.key]: Number(event.target.value)
                        }))
                      }
                      className={`field !border-white/10 !bg-white/8 !text-white ${field.prefix ? "!pl-8" : ""}`}
                    />
                  </div>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={generateReview}
              disabled={loading}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d9ff43] px-5 text-xs font-black text-[#121412] disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : review ? (
                <Save size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {loading
                ? "Reviewing performance..."
                : review
                  ? "Update execution review"
                  : "Generate execution review"}
            </button>
          </div>
        </div>
      ) : review ? (
        <div className="mt-6">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <div
              className={`rounded-3xl p-6 ${
                review.review.score >= 75
                  ? "bg-[#d9ff43]"
                  : review.review.score >= 45
                    ? "bg-[#695cff] text-white"
                    : "bg-[#171817] text-white"
              }`}
            >
              <p className="text-[10px] font-black tracking-wider opacity-55 uppercase">
                Execution score
              </p>
              <p className="display mt-4 text-8xl">
                {review.review.score}
              </p>
              <p className="mt-2 text-sm font-black">{review.review.status}</p>
              <p className="mt-5 text-xs leading-6 opacity-70">
                Updated{" "}
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                }).format(new Date(review.updatedAt))}
              </p>
            </div>
            <div className="rounded-3xl bg-[#f1efe8] p-5 sm:p-7">
              <p className="text-[10px] font-black tracking-wider text-[#695cff] uppercase">
                Marketing Director review
              </p>
              <p className="display mt-4 text-3xl leading-tight">
                {review.review.executiveSummary}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {metricCards.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-black/8 bg-white p-4"
              >
                <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
                  {label}
                </p>
                <p className="mt-2 text-xl font-black">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            {[
              ["Wins", review.review.wins, Check, "bg-[#d9ff43]"],
              [
                "Risks",
                review.review.risks,
                AlertTriangle,
                "bg-[#171817] text-white"
              ],
              [
                "Next actions",
                review.review.nextActions,
                ArrowRight,
                "bg-[#695cff] text-white"
              ]
            ].map(([title, items, Icon, color]) => {
              const ListIcon = Icon as typeof Check;
              return (
                <div key={title as string} className={`rounded-3xl p-5 ${color}`}>
                  <div className="flex items-center gap-2">
                    <ListIcon size={16} />
                    <p className="text-xs font-black">{title as string}</p>
                  </div>
                  <ol className="mt-4 grid gap-3">
                    {(items as string[]).map((item, index) => (
                      <li key={item} className="text-xs leading-6">
                        <span className="mr-2 font-black">{index + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {[
              ["Stop", review.review.stop, ArrowDown],
              ["Start", review.review.start, ArrowUp],
              ["Continue", review.review.continue, ArrowRight]
            ].map(([label, value, Icon]) => {
              const ActionIcon = Icon as typeof ArrowDown;
              return (
                <div
                  key={label as string}
                  className="rounded-2xl border border-black/8 bg-white p-5"
                >
                  <div className="flex items-center gap-2 text-[#695cff]">
                    <ActionIcon size={15} />
                    <p className="text-[10px] font-black tracking-wider uppercase">
                      {label as string}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7">{value as string}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-3xl bg-[#ece9df] p-5 sm:p-6">
            <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
              Budget decision
            </p>
            <p className="mt-3 text-sm font-bold leading-7">
              {review.review.budgetRecommendation}
            </p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
