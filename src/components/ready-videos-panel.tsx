"use client";

import {
  CalendarClock,
  Check,
  CirclePlay,
  Download,
  LoaderCircle,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
  Unlock,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  videoLibraryResponseSchema,
  type VideoLibraryResponse,
  type VideoReleaseView
} from "@/lib/schemas/videos";
import { formatInTimezone } from "@/lib/timezone";

type ReadyVideosPanelProps = {
  planId: string | null;
  hasSalesPitch: boolean;
  entitlement: number;
};

function countdown(releaseAt: string, now: number) {
  const difference = Math.max(0, new Date(releaseAt).getTime() - now);
  const totalMinutes = Math.ceil(difference / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function ReadyVideosPanel({
  planId,
  hasSalesPitch,
  entitlement
}: ReadyVideosPanelProps) {
  const router = useRouter();
  const [library, setLibrary] = useState<VideoLibraryResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<
    "load" | "assign" | "unlock" | "download" | "publish" | null
  >(hasSalesPitch && planId ? "load" : null);
  const [error, setError] = useState<string | null>(null);
  const [showUnlock, setShowUnlock] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!hasSalesPitch || !planId) {
      return;
    }

    let active = true;

    async function loadLibrary() {
      try {
        const response = await fetch(
          `/api/plans/videos?planId=${encodeURIComponent(planId!)}`
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "The video library could not load.");
        }

        const parsed = videoLibraryResponseSchema.parse(payload);

        if (active) {
          setLibrary(parsed);
          setSelectedId(parsed.releases[0]?.id ?? null);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "The video library could not load."
          );
        }
      } finally {
        if (active) {
          setLoading(null);
        }
      }
    }

    loadLibrary();

    return () => {
      active = false;
    };
  }, [hasSalesPitch, planId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedRelease = useMemo(
    () =>
      library?.releases.find((release) => release.id === selectedId) ??
      library?.releases[0] ??
      null,
    [library, selectedId]
  );
  const scheduledCount =
    library?.releases.filter((release) => !release.isAvailable).length ?? 0;

  if (!hasSalesPitch || !planId) {
    return null;
  }

  async function assignVideos() {
    setLoading("assign");
    setError(null);

    try {
      const response = await fetch("/api/plans/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", planId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Ready videos could not be assigned.");
      }

      const parsed = videoLibraryResponseSchema.parse(payload);
      setLibrary(parsed);
      setSelectedId(parsed.releases[0]?.id ?? null);
      router.refresh();
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Ready videos could not be assigned."
      );
    } finally {
      setLoading(null);
    }
  }

  async function unlockAll() {
    if (!acknowledged) {
      return;
    }

    setLoading("unlock");
    setError(null);

    try {
      const response = await fetch("/api/plans/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlock_all",
          planId,
          acknowledged: true
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The videos could not be unlocked.");
      }

      const parsed = videoLibraryResponseSchema.parse(payload);
      setLibrary(parsed);
      setShowUnlock(false);
      setAcknowledged(false);
    } catch (unlockError) {
      setError(
        unlockError instanceof Error
          ? unlockError.message
          : "The videos could not be unlocked."
      );
    } finally {
      setLoading(null);
    }
  }

  async function downloadVideo(release: VideoReleaseView) {
    setLoading("download");
    setError(null);

    try {
      const response = await fetch("/api/plans/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "download",
          planId,
          releaseId: release.id
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The video could not be downloaded.");
      }

      const anchor = document.createElement("a");
      anchor.href = payload.downloadUrl;
      anchor.download = `${release.title}.mp4`;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setLibrary((current) =>
        current
          ? {
              ...current,
              releases: current.releases.map((item) =>
                item.id === release.id
                  ? {
                      ...item,
                      status: "downloaded",
                      downloadedAt: new Date().toISOString()
                    }
                  : item
              )
            }
          : current
      );
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "The video could not be downloaded."
      );
    } finally {
      setLoading(null);
    }
  }

  async function markPublished(release: VideoReleaseView) {
    setLoading("publish");
    setError(null);

    try {
      const response = await fetch("/api/plans/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_published",
          planId,
          releaseId: release.id
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || "The video could not be marked as published."
        );
      }

      setLibrary(videoLibraryResponseSchema.parse(payload));
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "The video could not be marked as published."
      );
    } finally {
      setLoading(null);
    }
  }

  if (loading === "load") {
    return (
      <article className="card mt-4 grid min-h-40 place-items-center p-7">
        <div className="flex items-center gap-3 text-sm font-black">
          <LoaderCircle size={18} className="animate-spin text-[#695cff]" />
          Loading ready-video library...
        </div>
      </article>
    );
  }

  if (!library || library.releases.length === 0) {
    return (
      <article className="card mt-4 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
              <CirclePlay size={15} />
              Marketing and sales package ready
            </div>
            <h3 className="display mt-3 max-w-3xl text-4xl leading-none">
              Assign {entitlement} ready-made{" "}
              {entitlement === 1 ? "video" : "videos"} to this campaign.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#656a64]">
              The first video is available immediately. Remaining videos follow
              the recommended local release and publishing schedule.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#ece9df] px-3 py-1.5 text-[10px] font-black">
                Clean preview
              </span>
              <span className="rounded-full bg-[#ece9df] px-3 py-1.5 text-[10px] font-black">
                No third-party watermark
              </span>
              <span className="rounded-full bg-[#ece9df] px-3 py-1.5 text-[10px] font-black">
                Secure download
              </span>
            </div>
            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={assignVideos}
            disabled={loading !== null}
            className="button-primary shrink-0 disabled:opacity-60"
          >
            {loading === "assign" ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading === "assign" ? "Assigning videos..." : "Assign videos"}
          </button>
        </div>
      </article>
    );
  }

  if (!selectedRelease) {
    return null;
  }

  return (
    <article className="card mt-4 p-4 sm:p-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
            <Check size={15} />
            {library.assignedCount} of {library.entitlement} ready videos
            assigned
          </div>
          <h3 className="display mt-3 text-4xl leading-none">
            Campaign video release desk
          </h3>
          <p className="mt-3 text-xs font-bold text-[#777c75]">
            Recommended times are shown in {library.timezone}.
          </p>
        </div>
        {scheduledCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowUnlock(true);
              setError(null);
            }}
            className="button-secondary !min-h-10 !px-4 !text-xs"
          >
            <Unlock size={14} />
            Unlock all now
          </button>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="grid content-start gap-2">
          {library.releases.map((release, index) => (
            <button
              key={release.id}
              type="button"
              onClick={() => setSelectedId(release.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedRelease.id === release.id
                  ? "border-[#695cff] bg-[#695cff] text-white"
                  : "border-black/8 bg-white hover:border-black/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-[9px] font-black tracking-wider uppercase ${
                    selectedRelease.id === release.id
                      ? "text-white/55"
                      : "text-[#8a8f88]"
                  }`}
                >
                  Video {index + 1}
                </span>
                {release.isAvailable ? (
                  <Check size={14} />
                ) : (
                  <LockKeyhole size={13} />
                )}
              </div>
              <span className="mt-2 line-clamp-2 block text-xs font-black">
                {release.title}
              </span>
              <span className="mt-2 block text-[10px] opacity-70">
                {release.isAvailable
                  ? release.status === "downloaded"
                    ? "Downloaded"
                    : release.unlockedEarly
                      ? "Unlocked early"
                      : "Available now"
                  : `Unlocks in ${countdown(release.releaseAt, now)}`}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl bg-[#171817] text-white">
          <div className="grid gap-0 xl:grid-cols-[1.05fr_.95fr]">
            <div className="relative min-h-[360px] bg-black">
              {selectedRelease.previewUrl ? (
                <video
                  key={selectedRelease.previewUrl}
                  controls
                  preload="metadata"
                  poster={selectedRelease.thumbnailUrl ?? undefined}
                  className="h-full min-h-[360px] w-full bg-black object-contain"
                  src={selectedRelease.previewUrl}
                />
              ) : (
                <div className="grid min-h-[360px] place-items-center bg-[radial-gradient(circle_at_30%_20%,#695cff_0,transparent_35%),linear-gradient(145deg,#121412,#262826)]">
                  <div className="text-center">
                    <Play size={36} className="mx-auto text-[#d9ff43]" />
                    <p className="mt-4 text-xs font-black">
                      Clean preview is being prepared
                    </p>
                  </div>
                </div>
              )}
              <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-[9px] font-black tracking-wider uppercase backdrop-blur">
                Clean client preview
              </span>
            </div>

            <div className="flex flex-col p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/8 px-3 py-1.5 text-[9px] font-black uppercase">
                  {selectedRelease.platform}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1.5 text-[9px] font-black uppercase">
                  {selectedRelease.durationSeconds}s
                </span>
                {selectedRelease.status === "published" && (
                  <span className="rounded-full bg-[#d9ff43] px-3 py-1.5 text-[9px] font-black text-[#121412] uppercase">
                    Published
                  </span>
                )}
              </div>

              <h4 className="display mt-5 text-4xl leading-none">
                {selectedRelease.title}
              </h4>
              {selectedRelease.description && (
                <p className="mt-3 text-xs leading-6 text-white/50">
                  {selectedRelease.description}
                </p>
              )}

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-white/6 p-4">
                  <div className="flex items-center gap-2 text-[9px] font-black tracking-wider text-[#d9ff43] uppercase">
                    <CalendarClock size={13} />
                    Ideal publishing time
                  </div>
                  <p className="mt-2 text-sm font-black">
                    {formatInTimezone(
                      selectedRelease.publishAt,
                      library.timezone,
                      {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      }
                    )}
                  </p>
                </div>

                {!selectedRelease.isAvailable && (
                  <div className="rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center gap-2 text-[9px] font-black tracking-wider text-white/40 uppercase">
                      <LockKeyhole size={13} />
                      Download unlocks in
                    </div>
                    <p className="display mt-2 text-4xl text-[#d9ff43]">
                      {countdown(selectedRelease.releaseAt, now)}
                    </p>
                    <p className="mt-2 text-[10px] leading-5 text-white/45">
                      Scheduled for{" "}
                      {formatInTimezone(
                        selectedRelease.releaseAt,
                        library.timezone,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit"
                        }
                      )}
                      .
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4 text-[#121412]">
                <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
                  Recommended caption
                </p>
                <p className="mt-2 text-xs leading-6">
                  {selectedRelease.caption}
                </p>
                <p className="mt-3 text-xs font-black text-[#695cff]">
                  {selectedRelease.callToAction}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadVideo(selectedRelease)}
                  disabled={!selectedRelease.isAvailable || loading !== null}
                  className="button-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading === "download" ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : selectedRelease.isAvailable ? (
                    <Download size={16} />
                  ) : (
                    <LockKeyhole size={16} />
                  )}
                  {selectedRelease.isAvailable
                    ? "Download MP4"
                    : "Download scheduled"}
                </button>
                {selectedRelease.isAvailable &&
                  selectedRelease.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => markPublished(selectedRelease)}
                      disabled={loading !== null}
                      className="min-h-11 rounded-full border border-white/15 px-4 text-xs font-black disabled:opacity-40"
                    >
                      <ShieldCheck size={15} className="mr-2 inline" />
                      Mark published
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showUnlock && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#faf8f3] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black tracking-wider text-[#695cff] uppercase">
                  Early access
                </p>
                <h4 className="display mt-3 text-4xl leading-none">
                  Download every entitled video now?
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUnlock(false);
                  setAcknowledged(false);
                }}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-black/10 bg-white"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-5 text-sm leading-6 text-[#5d625c]">
              The release schedule is part of the campaign strategy. You can
              unlock every video early, but Campaignova cannot guarantee
              campaign performance when the recommended sequence and timing are
              not followed.
            </p>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="mt-1 size-4 accent-[#695cff]"
              />
              <span className="text-xs font-bold leading-5">
                I understand and still want to unlock all entitled videos.
              </span>
            </label>
            <button
              type="button"
              onClick={unlockAll}
              disabled={!acknowledged || loading !== null}
              className="button-primary mt-5 w-full disabled:opacity-40"
            >
              {loading === "unlock" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Unlock size={16} />
              )}
              Unlock all videos
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
