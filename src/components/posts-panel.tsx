"use client";

import {
  Check,
  Clipboard,
  FilePenLine,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  GeneratedPost,
  GeneratedPosts
} from "@/lib/schemas/posts";

type PostsPanelProps = {
  planId: string | null;
  hasCalendar: boolean;
  initialPosts: GeneratedPosts | null;
};

type EditableFields = Pick<
  GeneratedPost,
  "headline" | "body" | "caption" | "callToAction"
>;

function editableFields(post: GeneratedPost): EditableFields {
  return {
    headline: post.headline,
    body: post.body,
    caption: post.caption,
    callToAction: post.callToAction
  };
}

export function PostsPanel({
  planId,
  hasCalendar,
  initialPosts
}: PostsPanelProps) {
  const router = useRouter();
  const [postsPayload, setPostsPayload] = useState(initialPosts);
  const [selectedDay, setSelectedDay] = useState(
    initialPosts?.posts[0]?.dayNumber ?? 1
  );
  const [draft, setDraft] = useState<EditableFields | null>(
    initialPosts?.posts[0] ? editableFields(initialPosts.posts[0]) : null
  );
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState<
    "generate" | "save" | "regenerate" | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPost = useMemo(
    () =>
      postsPayload?.posts.find((post) => post.dayNumber === selectedDay) ??
      postsPayload?.posts[0] ??
      null,
    [postsPayload, selectedDay]
  );

  if (!hasCalendar || !planId) {
    return null;
  }

  function selectPost(post: GeneratedPost) {
    setSelectedDay(post.dayNumber);
    setDraft(editableFields(post));
    setEditing(false);
    setCopied(false);
    setError(null);
  }

  async function generatePosts() {
    setLoading("generate");
    setError(null);

    try {
      const response = await fetch("/api/plans/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Post generation failed.");
      }

      setPostsPayload(payload.posts);
      setSelectedDay(payload.posts.posts[0].dayNumber);
      setDraft(editableFields(payload.posts.posts[0]));
      router.refresh();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Post generation failed."
      );
    } finally {
      setLoading(null);
    }
  }

  async function updatePost(action: "edit" | "regenerate") {
    if (!selectedPost) {
      return;
    }

    setLoading(action === "edit" ? "save" : "regenerate");
    setError(null);

    try {
      const body =
        action === "edit"
          ? {
              action,
              planId,
              dayNumber: selectedPost.dayNumber,
              post: { ...selectedPost, ...draft }
            }
          : { action, planId, dayNumber: selectedPost.dayNumber };
      const response = await fetch("/api/plans/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The post could not be updated.");
      }

      setPostsPayload(payload.posts);
      setDraft(editableFields(payload.post));
      setEditing(false);
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The post could not be updated."
      );
    } finally {
      setLoading(null);
    }
  }

  async function copyPost() {
    if (!selectedPost) {
      return;
    }

    const text = [
      selectedPost.headline,
      selectedPost.caption,
      selectedPost.callToAction,
      selectedPost.hashtags.join(" ")
    ].join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  if (!postsPayload) {
    return (
      <article className="card mt-4 overflow-hidden p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
              <Sparkles size={15} />
              Calendar approved
            </div>
            <h3 className="display mt-3 max-w-3xl text-4xl leading-none">
              Produce 30 posts ready to publish.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#656a64]">
              Every post follows the approved date, channel, content pillar and
              campaign direction. Video days also include a recording script
              and shot list.
            </p>
            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={generatePosts}
            disabled={loading !== null}
            className="button-primary shrink-0 disabled:opacity-60"
          >
            {loading === "generate" ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading === "generate"
              ? "Producing 30 posts..."
              : "Generate 30 posts"}
          </button>
        </div>
      </article>
    );
  }

  if (!selectedPost || !draft) {
    return null;
  }

  return (
    <article className="card mt-4 p-4 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
            <Check size={15} />
            30 publishable posts ready
          </div>
          <h3 className="display mt-3 text-4xl leading-none">
            Content production desk
          </h3>
          <p className="mt-3 text-xs font-bold text-[#777c75]">
            Select a day, copy the final text, edit it or ask Campaignova for a
            new version.
          </p>
        </div>
        <button
          type="button"
          onClick={generatePosts}
          disabled={loading !== null}
          className="button-secondary !min-h-10 !px-4 !text-xs"
        >
          <RefreshCw size={14} />
          Rebuild all 30
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
          {postsPayload.posts.map((post) => (
            <button
              key={post.dayNumber}
              type="button"
              onClick={() => selectPost(post)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                selectedPost.dayNumber === post.dayNumber
                  ? "border-[#695cff] bg-[#695cff] text-white"
                  : "border-black/8 bg-white hover:border-black/20"
              }`}
            >
              <span
                className={`text-[9px] font-black tracking-wider uppercase ${
                  selectedPost.dayNumber === post.dayNumber
                    ? "text-white/55"
                    : "text-[#8a8f88]"
                }`}
              >
                Day {post.dayNumber} / {post.platform}
              </span>
              <span className="mt-1 line-clamp-2 block text-xs font-black">
                {post.headline}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 rounded-3xl bg-[#f1efe8] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                Day {selectedPost.dayNumber} / {selectedPost.date}
              </p>
              <p className="mt-1 text-xs font-bold text-[#695cff]">
                {selectedPost.platform} / {selectedPost.format} /{" "}
                {selectedPost.contentPillar}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyPost}
                className="button-secondary !min-h-9 !px-3 !text-[11px]"
              >
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setEditing((value) => !value)}
                className="button-secondary !min-h-9 !px-3 !text-[11px]"
              >
                {editing ? <X size={14} /> : <FilePenLine size={14} />}
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => updatePost("regenerate")}
                disabled={loading !== null}
                className="button-secondary !min-h-9 !px-3 !text-[11px] disabled:opacity-60"
              >
                {loading === "regenerate" ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Regenerate
              </button>
            </div>
          </div>

          {editing ? (
            <div className="mt-6 grid gap-4">
              {(
                [
                  ["headline", "Headline", 2],
                  ["body", "Body", 7],
                  ["caption", "Caption", 8],
                  ["callToAction", "Call to action", 3]
                ] as const
              ).map(([field, label, rows]) => (
                <label key={field} className="grid gap-2">
                  <span className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                    {label}
                  </span>
                  <textarea
                    value={draft[field]}
                    rows={rows}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, [field]: event.target.value }
                          : current
                      )
                    }
                    className="field resize-y !rounded-2xl !bg-white"
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={() => updatePost("edit")}
                disabled={loading !== null}
                className="button-primary w-fit disabled:opacity-60"
              >
                {loading === "save" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save changes
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <h4 className="text-2xl font-black leading-tight">
                {selectedPost.headline}
              </h4>
              <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[#444943]">
                {selectedPost.body}
              </p>
              <div className="mt-5 rounded-2xl bg-white p-4">
                <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
                  Publish caption
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                  {selectedPost.caption}
                </p>
                <p className="mt-4 text-sm font-black text-[#695cff]">
                  {selectedPost.callToAction}
                </p>
                <p className="mt-3 text-xs leading-5 text-[#777c75]">
                  {selectedPost.hashtags.join(" ")}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-black/8 bg-white/55 p-4">
                <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
                  Visual brief
                </p>
                <p className="mt-2 text-xs leading-5 text-[#555a54]">
                  {selectedPost.visualBrief}
                </p>
              </div>

              {selectedPost.videoScript && (
                <div className="mt-4 rounded-2xl bg-[#171817] p-4 text-white">
                  <p className="text-[9px] font-black tracking-wider text-[#d9ff43] uppercase">
                    Video script
                  </p>
                  <p className="mt-3 text-sm font-black">
                    {selectedPost.videoScript.hook}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-white/70">
                    {selectedPost.videoScript.spokenScript}
                  </p>
                  <ol className="mt-4 grid gap-2">
                    {selectedPost.videoScript.shotList.map((shot, index) => (
                      <li
                        key={`${selectedPost.dayNumber}-${index}`}
                        className="text-xs text-white/55"
                      >
                        {index + 1}. {shot}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
