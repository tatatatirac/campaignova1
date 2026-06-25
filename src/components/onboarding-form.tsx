"use client";

import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { saveCompany } from "@/app/onboarding/actions";
import { BrandMark } from "@/components/brand-mark";

const steps = [
  { number: 1, label: "Business" },
  { number: 2, label: "Audience" },
  { number: 3, label: "Direction" }
];

export function OnboardingForm({ error }: { error?: string }) {
  const [step, setStep] = useState(1);

  return (
    <main className="grid min-h-screen bg-[#f6f4ee] lg:grid-cols-[370px_1fr]">
      <aside className="noise relative hidden overflow-hidden bg-[#171817] p-10 text-white lg:flex lg:flex-col">
        <div className="absolute -left-32 bottom-10 size-80 rounded-full bg-[#695cff]/35 blur-3xl" />
        <BrandMark inverse />
        <div className="relative my-auto">
          <p className="text-[11px] font-black tracking-[.16em] text-[#d9ff43] uppercase">
            Business Memory
          </p>
          <h1 className="display mt-5 text-6xl leading-[.92]">
            Tell us once.
            <br />
            Build from it every month.
          </h1>
          <p className="mt-6 max-w-xs text-sm leading-6 text-white/55">
            Your answers become a reusable business profile. You can edit them
            whenever the offer or audience changes.
          </p>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 text-[#d9ff43]" size={17} />
            <p className="text-xs leading-5 text-white/65">
              Better inputs create sharper decisions. Specific beats impressive.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-20 items-center justify-between border-b border-black/10 px-5 sm:px-10">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <Link
            href="/"
            className="hidden items-center gap-2 text-xs font-black text-[#60655f] no-underline lg:flex"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>
          <span className="text-xs font-bold text-[#777c75]">
            About 3 minutes
          </span>
        </header>

        <form
          action={saveCompany}
          className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5 py-10 sm:px-10 sm:py-14"
        >
          <div className="mb-12 flex items-center">
            {steps.map((item, index) => (
              <div
                key={item.number}
                className="flex flex-1 items-center last:flex-none"
              >
                <button
                  type="button"
                  onClick={() => item.number < step && setStep(item.number)}
                  className="grid gap-2 text-left"
                >
                  <span
                    className={`grid size-8 place-items-center rounded-full text-xs font-black ${
                      item.number < step
                        ? "bg-[#121412] text-[#d9ff43]"
                        : item.number === step
                          ? "bg-[#695cff] text-white"
                          : "border border-black/10 bg-white text-[#8b9089]"
                    }`}
                  >
                    {item.number < step ? <Check size={14} /> : item.number}
                  </span>
                  <span
                    className={`hidden text-[10px] font-black uppercase tracking-wider sm:block ${
                      item.number === step
                        ? "text-[#121412]"
                        : "text-[#8b9089]"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-3 h-px flex-1 ${
                      item.number < step ? "bg-[#121412]" : "bg-black/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className={step === 1 ? "" : "hidden"}>
            <p className="eyebrow">Step 1 of 3</p>
            <h2 className="display mt-4 text-5xl leading-[.96] sm:text-6xl">
              Start with the business.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#686d67]">
              Give the marketing director the same context you would give a
              senior human hire.
            </p>
            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              <label className="field-label">
                Company name
                <input
                  name="name"
                  className="field"
                  placeholder="e.g. Northstar Dental"
                  required
                />
              </label>
              <label className="field-label">
                Industry
                <input
                  name="industry"
                  className="field"
                  placeholder="e.g. Cosmetic dentistry"
                  required
                />
              </label>
              <label className="field-label sm:col-span-2">
                Main product or service
                <textarea
                  name="offer"
                  className="field"
                  placeholder="Describe what you sell and the problem it solves."
                  minLength={20}
                  required
                />
              </label>
              <label className="field-label">
                Typical price
                <input
                  name="priceContext"
                  className="field"
                  placeholder="e.g. $1,500-$4,000"
                />
              </label>
              <label className="field-label">
                City / country
                <input
                  name="location"
                  className="field"
                  placeholder="e.g. Austin, USA"
                  required
                />
              </label>
            </div>
          </div>

          <div className={step === 2 ? "" : "hidden"}>
            <p className="eyebrow">Step 2 of 3</p>
            <h2 className="display mt-4 text-5xl leading-[.96] sm:text-6xl">
              Who needs to care?
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#686d67]">
              Avoid "everyone." The sharper the audience, the more persuasive
              the campaign.
            </p>
            <div className="mt-9 grid gap-5">
              <label className="field-label">
                Ideal customer
                <textarea
                  name="audience"
                  className="field"
                  placeholder="Who are they, what do they want and what usually stops them?"
                  minLength={20}
                  required
                />
              </label>
              <label className="field-label">
                Why should they choose you?
                <textarea
                  name="differentiator"
                  className="field"
                  placeholder="Your strongest proof, advantage or differentiator."
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="field-label">
                  Website
                  <input
                    name="websiteUrl"
                    type="url"
                    className="field"
                    placeholder="https://..."
                  />
                </label>
                <label className="field-label">
                  Main competitors
                  <input
                    name="competitors"
                    className="field"
                    placeholder="Names or URLs, separated by commas"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className={step === 3 ? "" : "hidden"}>
            <p className="eyebrow">Step 3 of 3</p>
            <h2 className="display mt-4 text-5xl leading-[.96] sm:text-6xl">
              Set the direction.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[#686d67]">
              These choices shape the voice, conversion goal and release
              calendar.
            </p>
            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              <label className="field-label">
                Primary goal
                <select
                  name="primaryGoal"
                  className="field"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Select one
                  </option>
                  <option>Generate qualified leads</option>
                  <option>Increase direct sales</option>
                  <option>Build local awareness</option>
                  <option>Launch a new offer</option>
                </select>
              </label>
              <label className="field-label">
                Brand tone
                <select
                  name="tone"
                  className="field"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Select one
                  </option>
                  <option>Expert and trustworthy</option>
                  <option>Direct and energetic</option>
                  <option>Premium and refined</option>
                  <option>Friendly and approachable</option>
                </select>
              </label>
              <div className="field-label">
                Content language
                <div className="field flex items-center text-[#656a64]">
                  English
                </div>
                <p className="text-[10px] font-medium text-[#8a8f88]">
                  Additional languages will be added after the MVP.
                </p>
              </div>
              <label className="field-label">
                Timezone
                <select
                  name="timezone"
                  className="field"
                  defaultValue="Europe/Belgrade"
                >
                  <option>Europe/Belgrade</option>
                  <option>Europe/London</option>
                  <option>America/New_York</option>
                  <option>America/Los_Angeles</option>
                </select>
              </label>
              <label className="field-label sm:col-span-2">
                Main call to action
                <input
                  name="primaryCta"
                  className="field"
                  placeholder="e.g. Book a free strategy call"
                  required
                />
              </label>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-12">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1}
              className="button-secondary disabled:pointer-events-none disabled:opacity-0"
            >
              <ArrowLeft size={17} />
              Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((current) => Math.min(3, current + 1))}
                className="button-primary"
              >
                Continue
                <ArrowRight size={17} />
              </button>
            ) : (
              <button type="submit" className="button-primary">
                Save Business Memory
                <Sparkles size={17} />
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
