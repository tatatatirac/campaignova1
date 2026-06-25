"use client";

import { ArrowRight, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MarketingStrategy } from "@/lib/schemas/strategy";

type StrategyPanelProps = {
  companyId: string;
  month: string;
  initialStrategy: MarketingStrategy | null;
};

export function StrategyPanel({
  companyId,
  month,
  initialStrategy
}: StrategyPanelProps) {
  const router = useRouter();
  const [strategy, setStrategy] = useState(initialStrategy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plans/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, month })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Strategy generation failed.");
      }

      setStrategy(payload.strategy);
      router.refresh();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Strategy generation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!strategy) {
    return (
      <article className="card mt-7 overflow-hidden !bg-[#171817] p-6 text-white sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[10px] font-black tracking-[.15em] text-[#d9ff43] uppercase">
              Strategy first
            </p>
            <h3 className="display mt-3 text-4xl leading-[.95] sm:text-5xl">
              Let Campaignova make the key decisions.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/55">
              We will define positioning, the core offer, campaign message,
              channel priorities, content pillars and measurable 30-day goals
              before producing posts or videos.
            </p>
            {error && (
              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="button-primary !border-[#d9ff43] !bg-[#d9ff43] !text-[#121412] disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading ? "Building strategy..." : "Generate strategy"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="card mt-7 p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
            <CheckCircle2 size={15} />
            Strategy ready
          </div>
          <h3 className="display mt-3 text-4xl leading-none">
            {strategy.keyMessage}
          </h3>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="button-secondary !min-h-10 !px-4 !text-xs"
        >
          {loading ? "Regenerating..." : "Regenerate"}
        </button>
      </div>
      <p className="mt-5 max-w-4xl text-sm leading-6 text-[#656a64]">
        {strategy.executiveSummary}
      </p>
      {error && (
        <p className="mt-4 rounded-xl border border-red-500/15 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {strategy.contentPillars.map((pillar) => (
          <div key={pillar.name} className="rounded-2xl bg-[#efede6] p-4">
            <p className="text-xs font-black">{pillar.name}</p>
            <p className="mt-2 text-[11px] leading-5 text-[#686d67]">
              {pillar.purpose}
            </p>
          </div>
        ))}
      </div>
      <button className="mt-6 inline-flex items-center gap-2 text-xs font-black text-[#695cff]">
        Review complete strategy
        <ArrowRight size={14} />
      </button>
    </article>
  );
}
