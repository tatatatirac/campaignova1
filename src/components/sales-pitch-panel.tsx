"use client";

import {
  Check,
  Clipboard,
  FilePenLine,
  LoaderCircle,
  MessageSquareQuote,
  RefreshCw,
  Save,
  Sparkles,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SalesPitch } from "@/lib/schemas/sales-pitch";

type SalesPitchPanelProps = {
  planId: string | null;
  hasLandingPage: boolean;
  initialPitch: SalesPitch | null;
};

type PitchSection =
  | "Overview"
  | "Discovery"
  | "Objections"
  | "Closing"
  | "Follow-up";

type FieldConfig = {
  path: string;
  label: string;
  rows: number;
};

const sections: PitchSection[] = [
  "Overview",
  "Discovery",
  "Objections",
  "Closing",
  "Follow-up"
];

const editorFields: Record<PitchSection, FieldConfig[]> = {
  Overview: [
    { path: "pitchName", label: "Internal pitch name", rows: 2 },
    {
      path: "audienceSnapshot.problem",
      label: "Customer problem",
      rows: 5
    },
    {
      path: "audienceSnapshot.desiredOutcome",
      label: "Desired outcome",
      rows: 5
    },
    {
      path: "audienceSnapshot.buyingTrigger",
      label: "Buying trigger",
      rows: 4
    },
    { path: "elevatorPitch", label: "Elevator pitch", rows: 8 }
  ],
  Discovery: [
    {
      path: "conversationPitch.opener",
      label: "Conversation opener",
      rows: 5
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      path: `conversationPitch.discoveryQuestions.${index}`,
      label: `Discovery question ${index + 1}`,
      rows: 3
    })),
    {
      path: "conversationPitch.transition",
      label: "Transition",
      rows: 5
    },
    {
      path: "conversationPitch.offerPresentation",
      label: "Offer presentation",
      rows: 10
    },
    {
      path: "conversationPitch.differentiator",
      label: "Differentiator",
      rows: 5
    },
    {
      path: "conversationPitch.callToAction",
      label: "Call to action",
      rows: 3
    }
  ],
  Objections: Array.from({ length: 5 }, (_, index) => [
    {
      path: `objections.${index}.objection`,
      label: `Objection ${index + 1}`,
      rows: 2
    },
    {
      path: `objections.${index}.response`,
      label: `Response ${index + 1}`,
      rows: 6
    },
    {
      path: `objections.${index}.bridgeQuestion`,
      label: `Bridge question ${index + 1}`,
      rows: 3
    }
  ]).flat(),
  Closing: [
    { path: "closing.summary", label: "Conversation summary", rows: 6 },
    { path: "closing.directClose", label: "Direct close", rows: 4 },
    {
      path: "closing.lowPressureClose",
      label: "Low-pressure close",
      rows: 4
    }
  ],
  "Follow-up": [
    { path: "followUp.emailSubject", label: "Email subject", rows: 2 },
    { path: "followUp.emailBody", label: "Follow-up email", rows: 10 },
    { path: "followUp.directMessage", label: "Direct message", rows: 5 }
  ]
};

function valueAtPath(pitch: SalesPitch, path: string) {
  let current: unknown = pitch;

  for (const segment of path.split(".")) {
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (current && typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return "";
    }
  }

  return typeof current === "string" ? current : "";
}

function updateAtPath(pitch: SalesPitch, path: string, value: string) {
  const next = structuredClone(pitch);
  const segments = path.split(".");
  let current: unknown = next;

  segments.slice(0, -1).forEach((segment) => {
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  });

  const finalSegment = segments.at(-1)!;

  if (Array.isArray(current)) {
    current[Number(finalSegment)] = value;
  } else {
    (current as Record<string, unknown>)[finalSegment] = value;
  }

  return next;
}

function pitchText(pitch: SalesPitch) {
  return [
    pitch.pitchName,
    "",
    "AUDIENCE SNAPSHOT",
    `Problem: ${pitch.audienceSnapshot.problem}`,
    `Desired outcome: ${pitch.audienceSnapshot.desiredOutcome}`,
    `Buying trigger: ${pitch.audienceSnapshot.buyingTrigger}`,
    "",
    "ELEVATOR PITCH",
    pitch.elevatorPitch,
    "",
    "CONVERSATION OPENER",
    pitch.conversationPitch.opener,
    "",
    "DISCOVERY QUESTIONS",
    ...pitch.conversationPitch.discoveryQuestions.map(
      (question, index) => `${index + 1}. ${question}`
    ),
    "",
    "TRANSITION",
    pitch.conversationPitch.transition,
    "",
    "OFFER PRESENTATION",
    pitch.conversationPitch.offerPresentation,
    "",
    "DIFFERENTIATOR",
    pitch.conversationPitch.differentiator,
    "",
    `CTA: ${pitch.conversationPitch.callToAction}`,
    "",
    "OBJECTION HANDLING",
    ...pitch.objections.flatMap((item, index) => [
      `${index + 1}. ${item.objection}`,
      item.response,
      `Bridge question: ${item.bridgeQuestion}`
    ]),
    "",
    "CLOSING",
    pitch.closing.summary,
    `Direct close: ${pitch.closing.directClose}`,
    `Low-pressure close: ${pitch.closing.lowPressureClose}`,
    "",
    "FOLLOW-UP EMAIL",
    `Subject: ${pitch.followUp.emailSubject}`,
    pitch.followUp.emailBody,
    "",
    "DIRECT MESSAGE",
    pitch.followUp.directMessage
  ].join("\n\n");
}

export function SalesPitchPanel({
  planId,
  hasLandingPage,
  initialPitch
}: SalesPitchPanelProps) {
  const router = useRouter();
  const [pitch, setPitch] = useState(initialPitch);
  const [draft, setDraft] = useState(initialPitch);
  const [selectedSection, setSelectedSection] =
    useState<PitchSection>("Overview");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState<"generate" | "save" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasLandingPage || !planId) {
    return null;
  }

  async function generatePitch() {
    setLoading("generate");
    setError(null);

    try {
      const response = await fetch("/api/plans/sales-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Sales pitch generation failed.");
      }

      setPitch(payload.pitch);
      setDraft(payload.pitch);
      setEditing(false);
      router.refresh();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Sales pitch generation failed."
      );
    } finally {
      setLoading(null);
    }
  }

  async function savePitch() {
    if (!draft) {
      return;
    }

    setLoading("save");
    setError(null);

    try {
      const response = await fetch("/api/plans/sales-pitch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", planId, pitch: draft })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The sales pitch could not be saved.");
      }

      setPitch(payload.pitch);
      setDraft(payload.pitch);
      setEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The sales pitch could not be saved."
      );
    } finally {
      setLoading(null);
    }
  }

  async function copyPitch() {
    if (!pitch) {
      return;
    }

    await navigator.clipboard.writeText(pitchText(pitch));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  if (!pitch || !draft) {
    return (
      <article className="card mt-4 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
              <MessageSquareQuote size={15} />
              Conversion page ready
            </div>
            <h3 className="display mt-3 max-w-3xl text-4xl leading-none">
              Turn the offer into a sales conversation that sounds human.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#656a64]">
              Campaignova will create the elevator pitch, discovery questions,
              offer explanation, objection responses, closing scripts and
              follow-up messages.
            </p>
            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={generatePitch}
            disabled={loading !== null}
            className="button-primary shrink-0 disabled:opacity-60"
          >
            {loading === "generate" ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading === "generate"
              ? "Building sales toolkit..."
              : "Generate sales pitch"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="card mt-4 p-4 sm:p-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
            <Check size={15} />
            Sales conversation ready
          </div>
          <h3 className="display mt-3 text-4xl leading-none">
            {pitch.pitchName}
          </h3>
          <p className="mt-3 max-w-2xl text-xs font-bold leading-5 text-[#777c75]">
            Qualification, offer presentation, objection handling, closing and
            follow-up in one consistent toolkit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyPitch}
            className="button-secondary !min-h-10 !px-4 !text-xs"
          >
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
            {copied ? "Copied" : "Copy toolkit"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(pitch);
              setEditing((value) => !value);
              setError(null);
            }}
            className="button-secondary !min-h-10 !px-4 !text-xs"
          >
            {editing ? <X size={14} /> : <FilePenLine size={14} />}
            {editing ? "Cancel edit" : "Edit pitch"}
          </button>
          <button
            type="button"
            onClick={generatePitch}
            disabled={loading !== null}
            className="button-secondary !min-h-10 !px-4 !text-xs disabled:opacity-60"
          >
            {loading === "generate" ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Rebuild pitch
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setSelectedSection(section)}
            className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black transition ${
              selectedSection === section
                ? "border-[#695cff] bg-[#695cff] text-white"
                : "border-black/8 bg-white hover:border-black/20"
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {editing ? (
        <div className="mt-4 rounded-3xl bg-[#f1efe8] p-4 sm:p-6">
          <div className="grid gap-4">
            {editorFields[selectedSection].map((field) => (
              <label key={field.path} className="grid gap-2">
                <span className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                  {field.label}
                </span>
                <textarea
                  value={valueAtPath(draft, field.path)}
                  rows={field.rows}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? updateAtPath(current, field.path, event.target.value)
                        : current
                    )
                  }
                  className="field resize-y !rounded-2xl !bg-white"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={savePitch}
            disabled={loading !== null}
            className="button-primary mt-5 w-fit disabled:opacity-60"
          >
            {loading === "save" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save sales pitch
          </button>
        </div>
      ) : (
        <div className="mt-4">
          {selectedSection === "Overview" && (
            <div className="grid gap-4 lg:grid-cols-[.75fr_1.25fr]">
              <div className="rounded-3xl bg-[#171817] p-5 text-white sm:p-7">
                <p className="text-[10px] font-black tracking-wider text-[#d9ff43] uppercase">
                  Audience snapshot
                </p>
                {[
                  ["Problem", pitch.audienceSnapshot.problem],
                  ["Desired outcome", pitch.audienceSnapshot.desiredOutcome],
                  ["Buying trigger", pitch.audienceSnapshot.buyingTrigger]
                ].map(([label, value]) => (
                  <div key={label} className="mt-5 border-t border-white/10 pt-4">
                    <p className="text-[9px] font-black tracking-wider text-white/40 uppercase">
                      {label}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-white/75">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl bg-[#d9ff43] p-5 sm:p-7">
                <p className="text-[10px] font-black tracking-wider uppercase">
                  Elevator pitch
                </p>
                <p className="display mt-5 text-3xl leading-tight sm:text-4xl">
                  {pitch.elevatorPitch}
                </p>
              </div>
            </div>
          )}

          {selectedSection === "Discovery" && (
            <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-3xl bg-[#695cff] p-5 text-white sm:p-7">
                <p className="text-[10px] font-black tracking-wider text-white/50 uppercase">
                  Conversation opener
                </p>
                <p className="mt-4 text-sm leading-7">
                  {pitch.conversationPitch.opener}
                </p>
                <p className="mt-7 text-[10px] font-black tracking-wider text-white/50 uppercase">
                  Discovery questions
                </p>
                <ol className="mt-3 grid gap-3">
                  {pitch.conversationPitch.discoveryQuestions.map(
                    (question, index) => (
                      <li
                        key={question}
                        className="rounded-2xl bg-white/10 p-4 text-xs leading-6"
                      >
                        <span className="mr-2 font-black text-[#d9ff43]">
                          {index + 1}.
                        </span>
                        {question}
                      </li>
                    )
                  )}
                </ol>
              </div>
              <div className="grid gap-3">
                {[
                  ["Transition", pitch.conversationPitch.transition],
                  [
                    "Offer presentation",
                    pitch.conversationPitch.offerPresentation
                  ],
                  ["Differentiator", pitch.conversationPitch.differentiator],
                  ["Call to action", pitch.conversationPitch.callToAction]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-black/8 bg-white p-5"
                  >
                    <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
                      {label}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#343934]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedSection === "Objections" && (
            <div className="grid gap-3">
              {pitch.objections.map((item, index) => (
                <div
                  key={item.objection}
                  className="rounded-3xl border border-black/8 bg-white p-5 sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#171817] text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-base font-black">{item.objection}</h4>
                      <p className="mt-3 text-sm leading-7 text-[#555a54]">
                        {item.response}
                      </p>
                      <p className="mt-4 rounded-xl bg-[#f1efe8] p-3 text-xs font-bold leading-5 text-[#695cff]">
                        Ask: {item.bridgeQuestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedSection === "Closing" && (
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                ["Conversation summary", pitch.closing.summary],
                ["Direct close", pitch.closing.directClose],
                ["Low-pressure close", pitch.closing.lowPressureClose]
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`rounded-3xl p-5 sm:p-6 ${
                    index === 1
                      ? "bg-[#d9ff43]"
                      : index === 2
                        ? "bg-[#695cff] text-white"
                        : "bg-[#171817] text-white"
                  }`}
                >
                  <p className="text-[9px] font-black tracking-wider opacity-55 uppercase">
                    {label}
                  </p>
                  <p className="mt-4 text-sm leading-7">{value}</p>
                </div>
              ))}
            </div>
          )}

          {selectedSection === "Follow-up" && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-3xl bg-white p-5 sm:p-7">
                <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
                  Email subject
                </p>
                <h4 className="mt-2 text-xl font-black">
                  {pitch.followUp.emailSubject}
                </h4>
                <p className="mt-5 whitespace-pre-wrap border-t border-black/8 pt-5 text-sm leading-7 text-[#343934]">
                  {pitch.followUp.emailBody}
                </p>
              </div>
              <div className="rounded-3xl bg-[#171817] p-5 text-white sm:p-7">
                <p className="text-[9px] font-black tracking-wider text-[#d9ff43] uppercase">
                  Direct message
                </p>
                <p className="mt-5 text-sm leading-7 text-white/80">
                  {pitch.followUp.directMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
