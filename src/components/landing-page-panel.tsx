"use client";

import {
  Check,
  Clipboard,
  FilePenLine,
  LayoutTemplate,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LandingPage } from "@/lib/schemas/landing-page";

type LandingPagePanelProps = {
  planId: string | null;
  hasEmails: boolean;
  initialPage: LandingPage | null;
};

type EditorSection =
  | "Hero"
  | "Problem"
  | "Benefits"
  | "Process"
  | "Offer"
  | "Trust"
  | "FAQ"
  | "Final CTA"
  | "SEO";

type FieldConfig = {
  path: string;
  label: string;
  rows: number;
};

const editorSections: Record<EditorSection, FieldConfig[]> = {
  Hero: [
    { path: "hero.eyebrow", label: "Eyebrow", rows: 2 },
    { path: "hero.headline", label: "Headline", rows: 3 },
    { path: "hero.subheadline", label: "Subheadline", rows: 5 },
    {
      path: "hero.primaryCallToAction",
      label: "Primary call to action",
      rows: 2
    },
    {
      path: "hero.secondaryCallToAction",
      label: "Secondary call to action",
      rows: 2
    }
  ],
  Problem: [
    { path: "problem.headline", label: "Problem headline", rows: 3 },
    { path: "problem.body", label: "Problem body", rows: 6 },
    { path: "problem.painPoints.0", label: "Pain point 1", rows: 3 },
    { path: "problem.painPoints.1", label: "Pain point 2", rows: 3 },
    { path: "problem.painPoints.2", label: "Pain point 3", rows: 3 },
    { path: "solution.headline", label: "Solution headline", rows: 3 },
    { path: "solution.body", label: "Solution body", rows: 6 }
  ],
  Benefits: [
    { path: "benefits.headline", label: "Benefits headline", rows: 3 },
    {
      path: "benefits.introduction",
      label: "Benefits introduction",
      rows: 4
    },
    { path: "benefits.items.0.title", label: "Benefit 1 title", rows: 2 },
    {
      path: "benefits.items.0.description",
      label: "Benefit 1 description",
      rows: 4
    },
    { path: "benefits.items.1.title", label: "Benefit 2 title", rows: 2 },
    {
      path: "benefits.items.1.description",
      label: "Benefit 2 description",
      rows: 4
    },
    { path: "benefits.items.2.title", label: "Benefit 3 title", rows: 2 },
    {
      path: "benefits.items.2.description",
      label: "Benefit 3 description",
      rows: 4
    }
  ],
  Process: [
    { path: "process.headline", label: "Process headline", rows: 3 },
    {
      path: "process.introduction",
      label: "Process introduction",
      rows: 4
    },
    { path: "process.steps.0.title", label: "Step 1 title", rows: 2 },
    {
      path: "process.steps.0.description",
      label: "Step 1 description",
      rows: 4
    },
    { path: "process.steps.1.title", label: "Step 2 title", rows: 2 },
    {
      path: "process.steps.1.description",
      label: "Step 2 description",
      rows: 4
    },
    { path: "process.steps.2.title", label: "Step 3 title", rows: 2 },
    {
      path: "process.steps.2.description",
      label: "Step 3 description",
      rows: 4
    }
  ],
  Offer: [
    { path: "offer.headline", label: "Offer headline", rows: 3 },
    { path: "offer.body", label: "Offer body", rows: 6 },
    { path: "offer.inclusions.0", label: "Inclusion 1", rows: 3 },
    { path: "offer.inclusions.1", label: "Inclusion 2", rows: 3 },
    { path: "offer.inclusions.2", label: "Inclusion 3", rows: 3 },
    {
      path: "offer.callToAction",
      label: "Offer call to action",
      rows: 2
    }
  ],
  Trust: [
    { path: "trust.headline", label: "Trust headline", rows: 3 },
    { path: "trust.body", label: "Trust body", rows: 5 },
    { path: "trust.reasons.0.title", label: "Reason 1 title", rows: 2 },
    {
      path: "trust.reasons.0.description",
      label: "Reason 1 description",
      rows: 4
    },
    { path: "trust.reasons.1.title", label: "Reason 2 title", rows: 2 },
    {
      path: "trust.reasons.1.description",
      label: "Reason 2 description",
      rows: 4
    },
    { path: "trust.reasons.2.title", label: "Reason 3 title", rows: 2 },
    {
      path: "trust.reasons.2.description",
      label: "Reason 3 description",
      rows: 4
    }
  ],
  FAQ: [
    { path: "faq.headline", label: "FAQ headline", rows: 3 },
    { path: "faq.items.0.question", label: "Question 1", rows: 2 },
    { path: "faq.items.0.answer", label: "Answer 1", rows: 5 },
    { path: "faq.items.1.question", label: "Question 2", rows: 2 },
    { path: "faq.items.1.answer", label: "Answer 2", rows: 5 },
    { path: "faq.items.2.question", label: "Question 3", rows: 2 },
    { path: "faq.items.2.answer", label: "Answer 3", rows: 5 },
    { path: "faq.items.3.question", label: "Question 4", rows: 2 },
    { path: "faq.items.3.answer", label: "Answer 4", rows: 5 },
    { path: "faq.items.4.question", label: "Question 5", rows: 2 },
    { path: "faq.items.4.answer", label: "Answer 5", rows: 5 }
  ],
  "Final CTA": [
    {
      path: "finalCallToAction.headline",
      label: "Final headline",
      rows: 3
    },
    { path: "finalCallToAction.body", label: "Final body", rows: 5 },
    {
      path: "finalCallToAction.callToAction",
      label: "Final call to action",
      rows: 2
    }
  ],
  SEO: [
    { path: "pageName", label: "Internal page name", rows: 2 },
    { path: "seo.title", label: "SEO title", rows: 2 },
    { path: "seo.description", label: "SEO description", rows: 4 }
  ]
};

const sectionNames = Object.keys(editorSections) as EditorSection[];

function valueAtPath(page: LandingPage, path: string) {
  let current: unknown = page;

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

function updateAtPath(page: LandingPage, path: string, value: string) {
  const next = structuredClone(page);
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
  const finalValue =
    path === "hero.secondaryCallToAction" && value.trim() === ""
      ? null
      : value;

  if (Array.isArray(current)) {
    current[Number(finalSegment)] = finalValue;
  } else {
    (current as Record<string, unknown>)[finalSegment] = finalValue;
  }

  return next;
}

function landingPageText(page: LandingPage) {
  return [
    page.hero.eyebrow,
    page.hero.headline,
    page.hero.subheadline,
    `CTA: ${page.hero.primaryCallToAction}`,
    page.hero.secondaryCallToAction
      ? `Secondary CTA: ${page.hero.secondaryCallToAction}`
      : null,
    "",
    page.problem.headline,
    page.problem.body,
    ...page.problem.painPoints.map((item) => `- ${item}`),
    "",
    page.solution.headline,
    page.solution.body,
    "",
    page.benefits.headline,
    page.benefits.introduction,
    ...page.benefits.items.flatMap((item) => [
      item.title,
      item.description
    ]),
    "",
    page.process.headline,
    page.process.introduction,
    ...page.process.steps.flatMap((step, index) => [
      `${index + 1}. ${step.title}`,
      step.description
    ]),
    "",
    page.offer.headline,
    page.offer.body,
    ...page.offer.inclusions.map((item) => `- ${item}`),
    `CTA: ${page.offer.callToAction}`,
    "",
    page.trust.headline,
    page.trust.body,
    ...page.trust.reasons.flatMap((reason) => [
      reason.title,
      reason.description
    ]),
    "",
    page.faq.headline,
    ...page.faq.items.flatMap((item) => [item.question, item.answer]),
    "",
    page.finalCallToAction.headline,
    page.finalCallToAction.body,
    `CTA: ${page.finalCallToAction.callToAction}`,
    "",
    `SEO title: ${page.seo.title}`,
    `SEO description: ${page.seo.description}`
  ]
    .filter((value) => value !== null)
    .join("\n\n");
}

export function LandingPagePanel({
  planId,
  hasEmails,
  initialPage
}: LandingPagePanelProps) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [draft, setDraft] = useState(initialPage);
  const [selectedSection, setSelectedSection] =
    useState<EditorSection>("Hero");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState<"generate" | "save" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasEmails || !planId) {
    return null;
  }

  async function generatePage() {
    setLoading("generate");
    setError(null);

    try {
      const response = await fetch("/api/plans/landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Landing page generation failed.");
      }

      setPage(payload.page);
      setDraft(payload.page);
      setEditing(false);
      router.refresh();
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Landing page generation failed."
      );
    } finally {
      setLoading(null);
    }
  }

  async function savePage() {
    if (!draft) {
      return;
    }

    setLoading("save");
    setError(null);

    try {
      const response = await fetch("/api/plans/landing-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", planId, page: draft })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The landing page could not be saved.");
      }

      setPage(payload.page);
      setDraft(payload.page);
      setEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The landing page could not be saved."
      );
    } finally {
      setLoading(null);
    }
  }

  async function copyPage() {
    if (!page) {
      return;
    }

    await navigator.clipboard.writeText(landingPageText(page));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  }

  if (!page || !draft) {
    return (
      <article className="card mt-4 p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[.15em] text-[#695cff] uppercase">
              <LayoutTemplate size={15} />
              Conversion sequence ready
            </div>
            <h3 className="display mt-3 max-w-3xl text-4xl leading-none">
              Turn the campaign into complete landing page copy.
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#656a64]">
              Campaignova will write the hero, problem, benefits, process,
              offer, trust, FAQ, final call to action and SEO copy.
            </p>
            {error && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={generatePage}
            disabled={loading !== null}
            className="button-primary shrink-0 disabled:opacity-60"
          >
            {loading === "generate" ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Sparkles size={17} />
            )}
            {loading === "generate"
              ? "Writing landing page..."
              : "Generate landing page"}
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
            Landing page ready
          </div>
          <h3 className="display mt-3 text-4xl leading-none">
            {page.pageName}
          </h3>
          <p className="mt-3 max-w-2xl text-xs font-bold leading-5 text-[#777c75]">
            Complete conversion copy with one audience, one offer and one
            primary action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyPage}
            className="button-secondary !min-h-10 !px-4 !text-xs"
          >
            {copied ? <Check size={14} /> : <Clipboard size={14} />}
            {copied ? "Copied" : "Copy page"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(page);
              setEditing((value) => !value);
              setError(null);
            }}
            className="button-secondary !min-h-10 !px-4 !text-xs"
          >
            {editing ? <X size={14} /> : <FilePenLine size={14} />}
            {editing ? "Cancel edit" : "Edit copy"}
          </button>
          <button
            type="button"
            onClick={generatePage}
            disabled={loading !== null}
            className="button-secondary !min-h-10 !px-4 !text-xs disabled:opacity-60"
          >
            {loading === "generate" ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            Rebuild page
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {editing ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[210px_1fr]">
          <div className="grid content-start gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {sectionNames.map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setSelectedSection(section)}
                className={`rounded-xl border px-4 py-3 text-left text-xs font-black transition ${
                  selectedSection === section
                    ? "border-[#695cff] bg-[#695cff] text-white"
                    : "border-black/8 bg-white hover:border-black/20"
                }`}
              >
                {section}
              </button>
            ))}
          </div>
          <div className="rounded-3xl bg-[#f1efe8] p-4 sm:p-6">
            <div className="grid gap-4">
              {editorSections[selectedSection].map((field) => (
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
                          ? updateAtPath(
                              current,
                              field.path,
                              event.target.value
                            )
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
              onClick={savePage}
              disabled={loading !== null}
              className="button-primary mt-5 w-fit disabled:opacity-60"
            >
              {loading === "save" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Save landing page
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[28px] border border-black/8 bg-white">
          <section className="bg-[#171817] px-5 py-12 text-center text-white sm:px-10 sm:py-16">
            <p className="text-[10px] font-black tracking-[.16em] text-[#d9ff43] uppercase">
              {page.hero.eyebrow}
            </p>
            <h4 className="display mx-auto mt-4 max-w-4xl text-4xl leading-none sm:text-6xl">
              {page.hero.headline}
            </h4>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/65">
              {page.hero.subheadline}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <span className="rounded-full bg-[#d9ff43] px-5 py-3 text-xs font-black text-[#121412]">
                {page.hero.primaryCallToAction}
              </span>
              {page.hero.secondaryCallToAction && (
                <span className="rounded-full border border-white/20 px-5 py-3 text-xs font-black">
                  {page.hero.secondaryCallToAction}
                </span>
              )}
            </div>
          </section>

          <section className="grid gap-8 px-5 py-10 sm:px-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">The problem</p>
              <h4 className="display mt-3 text-4xl leading-none">
                {page.problem.headline}
              </h4>
              <p className="mt-5 text-sm leading-7 text-[#5d625c]">
                {page.problem.body}
              </p>
              <ul className="mt-5 grid gap-2">
                {page.problem.painPoints.map((painPoint) => (
                  <li
                    key={painPoint}
                    className="rounded-2xl bg-[#f1efe8] p-4 text-xs font-bold leading-5"
                  >
                    {painPoint}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-[#695cff] p-6 text-white sm:p-8">
              <p className="text-[10px] font-black tracking-wider text-white/50 uppercase">
                The solution
              </p>
              <h4 className="display mt-3 text-4xl leading-none">
                {page.solution.headline}
              </h4>
              <p className="mt-5 text-sm leading-7 text-white/75">
                {page.solution.body}
              </p>
            </div>
          </section>

          <section className="bg-[#f1efe8] px-5 py-10 sm:px-10">
            <p className="eyebrow">Benefits</p>
            <h4 className="display mt-3 max-w-3xl text-4xl leading-none">
              {page.benefits.headline}
            </h4>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5d625c]">
              {page.benefits.introduction}
            </p>
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {page.benefits.items.map((benefit) => (
                <div key={benefit.title} className="rounded-2xl bg-white p-5">
                  <h5 className="text-sm font-black">{benefit.title}</h5>
                  <p className="mt-3 text-xs leading-6 text-[#656a64]">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="px-5 py-10 sm:px-10">
            <p className="eyebrow">How it works</p>
            <h4 className="display mt-3 max-w-3xl text-4xl leading-none">
              {page.process.headline}
            </h4>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5d625c]">
              {page.process.introduction}
            </p>
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {page.process.steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-black/8 p-5"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-[#d9ff43] text-xs font-black">
                    {index + 1}
                  </span>
                  <h5 className="mt-4 text-sm font-black">{step.title}</h5>
                  <p className="mt-3 text-xs leading-6 text-[#656a64]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 bg-[#171817] px-5 py-10 text-white sm:px-10 lg:grid-cols-2">
            <div className="rounded-3xl bg-white/6 p-6">
              <p className="text-[10px] font-black tracking-wider text-[#d9ff43] uppercase">
                The offer
              </p>
              <h4 className="display mt-3 text-4xl leading-none">
                {page.offer.headline}
              </h4>
              <p className="mt-5 text-sm leading-7 text-white/65">
                {page.offer.body}
              </p>
              <ul className="mt-5 grid gap-2 text-xs text-white/75">
                {page.offer.inclusions.map((inclusion) => (
                  <li key={inclusion}>+ {inclusion}</li>
                ))}
              </ul>
              <p className="mt-6 inline-flex rounded-full bg-[#d9ff43] px-5 py-3 text-xs font-black text-[#121412]">
                {page.offer.callToAction}
              </p>
            </div>
            <div className="rounded-3xl bg-white p-6 text-[#121412]">
              <p className="eyebrow">Why this approach</p>
              <h4 className="display mt-3 text-4xl leading-none">
                {page.trust.headline}
              </h4>
              <p className="mt-5 text-sm leading-7 text-[#5d625c]">
                {page.trust.body}
              </p>
              <div className="mt-5 grid gap-3">
                {page.trust.reasons.map((reason) => (
                  <div key={reason.title} className="border-t border-black/8 pt-3">
                    <p className="text-xs font-black">{reason.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#656a64]">
                      {reason.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-5 py-10 sm:px-10">
            <p className="eyebrow">FAQ</p>
            <h4 className="display mt-3 text-4xl leading-none">
              {page.faq.headline}
            </h4>
            <div className="mt-7 grid gap-3">
              {page.faq.items.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-black/8 p-5"
                >
                  <h5 className="text-sm font-black">{item.question}</h5>
                  <p className="mt-3 text-xs leading-6 text-[#656a64]">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#d9ff43] px-5 py-12 text-center sm:px-10">
            <h4 className="display mx-auto max-w-3xl text-4xl leading-none sm:text-5xl">
              {page.finalCallToAction.headline}
            </h4>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7">
              {page.finalCallToAction.body}
            </p>
            <p className="mt-6 inline-flex rounded-full bg-[#121412] px-5 py-3 text-xs font-black text-white">
              {page.finalCallToAction.callToAction}
            </p>
          </section>

          <section className="border-t border-black/8 px-5 py-5 sm:px-10">
            <p className="text-[9px] font-black tracking-wider text-[#777c75] uppercase">
              SEO preview
            </p>
            <p className="mt-2 text-sm font-black">{page.seo.title}</p>
            <p className="mt-1 text-xs leading-5 text-[#656a64]">
              {page.seo.description}
            </p>
          </section>
        </div>
      )}
    </article>
  );
}
