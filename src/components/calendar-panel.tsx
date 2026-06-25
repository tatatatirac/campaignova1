"use client";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ContentCalendar } from "@/lib/schemas/calendar";

type CalendarPanelProps = {
  planId: string | null;
  hasStrategy: boolean;
  initialCalendar: ContentCalendar | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

export function CalendarPanel({
  planId,
  hasStrategy,
  initialCalendar
}: CalendarPanelProps) {
  const router = useRouter();
  const [calendar, setCalendar] = useState(initialCalendar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasStrategy || !planId) {
    return null;
  }

  async function generateCalendar() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plans/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Calendar generation failed.");
      }

      setCalendar(payload.calendar);
      router.refresh();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Calendar generation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!calendar) {
    return (
      <article className="card mt-4 p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
              <CheckCircle2 size={15} />
              Strategy ready for approval
            </div>
            <h3 className="display mt-3 text-4xl leading-none">
              Turn the decisions into 30 days of action.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#656a64]">
              Approving the strategy locks its positioning, offer, audience and
              key message. Campaignova will then build one primary content move
              for every day.
            </p>
            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={generateCalendar}
            disabled={loading}
            className="button-primary shrink-0 disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading ? "Building 30 days..." : "Approve & build calendar"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="card mt-4 p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
            <CalendarDays size={15} />
            30-day calendar ready
          </div>
          <h3 className="display mt-3 text-4xl leading-none">
            {calendar.monthlyTheme}
          </h3>
          <p className="mt-3 text-xs font-bold text-[#777c75]">
            {calendar.timezone} / 30 scheduled content moves
          </p>
        </div>
        <button
          type="button"
          onClick={generateCalendar}
          disabled={loading}
          className="button-secondary !min-h-10 !px-4 !text-xs"
        >
          {loading ? "Regenerating..." : "Regenerate calendar"}
        </button>
      </div>

      <div className="mt-6 grid gap-2">
        {calendar.items.slice(0, 7).map((item) => (
          <div
            key={item.dayNumber}
            className="grid gap-3 rounded-2xl border border-black/8 bg-white p-4 sm:grid-cols-[70px_110px_1fr_auto] sm:items-center"
          >
            <div>
              <p className="text-[9px] font-black tracking-wider text-[#8a8f88] uppercase">
                Day {item.dayNumber}
              </p>
              <p className="mt-1 text-sm font-black">{formatDate(item.date)}</p>
            </div>
            <div>
              <p className="text-xs font-black">{item.platform}</p>
              <p className="mt-1 text-[10px] text-[#777c75]">{item.format}</p>
            </div>
            <div>
              <p className="text-xs font-black">{item.topic}</p>
              <p className="mt-1 line-clamp-1 text-[10px] text-[#777c75]">
                {item.hook}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#695cff]">
              <Clock3 size={13} />
              {item.publishTimeLocal}
            </span>
          </div>
        ))}
      </div>
      <button className="mt-5 text-xs font-black text-[#695cff]">
        View all 30 days
      </button>
    </article>
  );
}
