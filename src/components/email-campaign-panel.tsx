"use client";

import {
  Check,
  Clipboard,
  FilePenLine,
  LoaderCircle,
  Mail,
  RefreshCw,
  Save,
  Sparkles,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  GeneratedEmail,
  GeneratedEmailCampaign
} from "@/lib/schemas/emails";

type EmailCampaignPanelProps = {
  planId: string | null;
  hasPosts: boolean;
  initialCampaign: GeneratedEmailCampaign | null;
};

type EditableEmail = Pick<
  GeneratedEmail,
  | "internalName"
  | "subjectLine"
  | "alternateSubjectLine"
  | "previewText"
  | "body"
  | "callToAction"
  | "postscript"
>;

function editableEmail(email: GeneratedEmail): EditableEmail {
  return {
    internalName: email.internalName,
    subjectLine: email.subjectLine,
    alternateSubjectLine: email.alternateSubjectLine,
    previewText: email.previewText,
    body: email.body,
    callToAction: email.callToAction,
    postscript: email.postscript
  };
}

export function EmailCampaignPanel({
  planId,
  hasPosts,
  initialCampaign
}: EmailCampaignPanelProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [selectedNumber, setSelectedNumber] = useState(
    initialCampaign?.emails[0]?.sequenceNumber ?? 1
  );
  const [draft, setDraft] = useState<EditableEmail | null>(
    initialCampaign?.emails[0]
      ? editableEmail(initialCampaign.emails[0])
      : null
  );
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState<
    "generate" | "save" | "regenerate" | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEmail = useMemo(
    () =>
      campaign?.emails.find(
        (email) => email.sequenceNumber === selectedNumber
      ) ??
      campaign?.emails[0] ??
      null,
    [campaign, selectedNumber]
  );

  if (!hasPosts || !planId) {
    return null;
  }

  function selectEmail(email: GeneratedEmail) {
    setSelectedNumber(email.sequenceNumber);
    setDraft(editableEmail(email));
    setEditing(false);
    setCopied(false);
    setError(null);
  }

  async function generateCampaign() {
    setLoading("generate");
    setError(null);

    try {
      const response = await fetch("/api/plans/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Email campaign generation failed.");
      }

      setCampaign(payload.campaign);
      setSelectedNumber(payload.campaign.emails[0].sequenceNumber);
      setDraft(editableEmail(payload.campaign.emails[0]));
      router.refresh();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Email campaign generation failed."
      );
    } finally {
      setLoading(null);
    }
  }

  async function updateEmail(action: "edit" | "regenerate") {
    if (!selectedEmail) {
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
              sequenceNumber: selectedEmail.sequenceNumber,
              email: { ...selectedEmail, ...draft }
            }
          : {
              action,
              planId,
              sequenceNumber: selectedEmail.sequenceNumber
            };
      const response = await fetch("/api/plans/emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The email could not be updated.");
      }

      setCampaign(payload.campaign);
      setDraft(editableEmail(payload.email));
      setEditing(false);
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The email could not be updated."
      );
    } finally {
      setLoading(null);
    }
  }

  async function copyEmail() {
    if (!selectedEmail) {
      return;
    }

    await navigator.clipboard.writeText(
      [
        `Subject: ${selectedEmail.subjectLine}`,
        `Preview: ${selectedEmail.previewText}`,
        selectedEmail.body,
        selectedEmail.callToAction,
        selectedEmail.postscript
      ]
        .filter(Boolean)
        .join("\n\n")
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  if (!campaign) {
    return (
      <article className="card mt-4 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
              <Mail size={15} />
              Social campaign ready
            </div>
            <h3 className="display mt-3 max-w-3xl text-4xl leading-none">
              Turn attention into a five-email conversion sequence.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#656a64]">
              Campaignova will create the subject lines, preview text, complete
              email copy, calls to action and recommended send days.
            </p>
            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={generateCampaign}
            disabled={loading !== null}
            className="button-primary shrink-0 disabled:opacity-60"
          >
            {loading === "generate" ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading === "generate"
              ? "Writing five emails..."
              : "Generate email campaign"}
          </button>
        </div>
      </article>
    );
  }

  if (!selectedEmail || !draft) {
    return null;
  }

  return (
    <article className="card mt-4 p-4 sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
            <Check size={15} />
            Five-email campaign ready
          </div>
          <h3 className="display mt-3 text-4xl leading-none">
            {campaign.campaignName}
          </h3>
          <p className="mt-3 text-xs font-bold text-[#777c75]">
            A complete sequence from problem awareness to the final call to
            action.
          </p>
        </div>
        <button
          type="button"
          onClick={generateCampaign}
          disabled={loading !== null}
          className="button-secondary !min-h-10 !px-4 !text-xs"
        >
          <RefreshCw size={14} />
          Rebuild all five
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[250px_1fr]">
        <div className="grid gap-2">
          {campaign.emails.map((email) => (
            <button
              key={email.sequenceNumber}
              type="button"
              onClick={() => selectEmail(email)}
              className={`rounded-2xl border p-4 text-left transition ${
                selectedEmail.sequenceNumber === email.sequenceNumber
                  ? "border-[#695cff] bg-[#695cff] text-white"
                  : "border-black/8 bg-white hover:border-black/20"
              }`}
            >
              <span
                className={`text-[9px] font-black tracking-wider uppercase ${
                  selectedEmail.sequenceNumber === email.sequenceNumber
                    ? "text-white/55"
                    : "text-[#8a8f88]"
                }`}
              >
                Email {email.sequenceNumber} / Day {email.sendDay}
              </span>
              <span className="mt-1 block text-xs font-black">
                {email.role}
              </span>
              <span className="mt-1 line-clamp-2 block text-[10px] opacity-70">
                {email.subjectLine}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 rounded-3xl bg-[#f1efe8] p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                Email {selectedEmail.sequenceNumber} / Send day{" "}
                {selectedEmail.sendDay}
              </p>
              <p className="mt-1 text-xs font-bold text-[#695cff]">
                {selectedEmail.role}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyEmail}
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
                onClick={() => updateEmail("regenerate")}
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
                  ["internalName", "Internal name", 2],
                  ["subjectLine", "Subject line", 2],
                  ["alternateSubjectLine", "Alternate subject", 2],
                  ["previewText", "Preview text", 3],
                  ["body", "Email body", 12],
                  ["callToAction", "Call to action", 3],
                  ["postscript", "Postscript", 3]
                ] as const
              ).map(([field, label, rows]) => (
                <label key={field} className="grid gap-2">
                  <span className="text-[10px] font-black tracking-wider text-[#777c75] uppercase">
                    {label}
                  </span>
                  <textarea
                    value={draft[field] ?? ""}
                    rows={rows}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              [field]:
                                field === "postscript" &&
                                event.target.value === ""
                                  ? null
                                  : event.target.value
                            }
                          : current
                      )
                    }
                    className="field resize-y !rounded-2xl !bg-white"
                  />
                </label>
              ))}
              <button
                type="button"
                onClick={() => updateEmail("edit")}
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
              <div className="rounded-2xl bg-white p-4">
                <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
                  Subject
                </p>
                <h4 className="mt-2 text-xl font-black">
                  {selectedEmail.subjectLine}
                </h4>
                <p className="mt-2 text-xs text-[#777c75]">
                  Alternate: {selectedEmail.alternateSubjectLine}
                </p>
                <p className="mt-3 border-t border-black/8 pt-3 text-xs text-[#555a54]">
                  Preview: {selectedEmail.previewText}
                </p>
              </div>
              <div className="mt-4 rounded-2xl bg-white p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-[#343934]">
                  {selectedEmail.body}
                </p>
                <p className="mt-5 text-sm font-black text-[#695cff]">
                  {selectedEmail.callToAction}
                </p>
                {selectedEmail.postscript && (
                  <p className="mt-5 border-t border-black/8 pt-4 text-xs leading-5 text-[#656a64]">
                    {selectedEmail.postscript}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
