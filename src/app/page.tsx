import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Mail,
  MousePointer2,
  Play,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import Link from "next/link";
import { Pricing } from "@/components/pricing";
import { SiteHeader } from "@/components/site-header";

const deliverables = [
  ["Strategy", "Positioning, audience, offer and channel decisions", Target],
  ["30-day calendar", "What to publish, where and at what local time", CalendarDays],
  ["Ready content", "Posts, emails, video scripts and landing copy", Sparkles],
  ["Ready-made videos", "Clean vertical videos released with your schedule", Play]
] as const;

const timeline = [
  { day: "MON 08", title: "Pain-point reel", time: "18:30", status: "Ready" },
  { day: "WED 10", title: "Proof carousel", time: "12:15", status: "Scheduled" },
  { day: "FRI 12", title: "Offer video", time: "19:00", status: "Scheduled" }
];

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <SiteHeader />

      <section className="noise grid-lines relative min-h-[760px] border-b border-black/10 pt-32 sm:min-h-[850px] sm:pt-40">
        <div className="absolute -right-32 top-10 size-[520px] rounded-full bg-[#d9ff43]/45 blur-3xl" />
        <div className="absolute -left-40 top-64 size-[440px] rounded-full bg-[#695cff]/15 blur-3xl" />
        <div className="shell relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-[690px]">
            <span className="eyebrow">Your monthly marketing operating system</span>
            <h1 className="display mt-7 text-[62px] leading-[0.88] sm:text-[88px] lg:text-[104px]">
              Know exactly
              <br />
              what to post
              <br />
              <span className="relative inline-block">
                next.
                <svg
                  viewBox="0 0 280 22"
                  className="absolute -bottom-2 left-0 w-full text-[#695cff]"
                  aria-hidden="true"
                >
                  <path
                    d="M4 14C71 3 193 2 276 12"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
              </span>
            </h1>
            <p className="mt-9 max-w-xl text-[17px] leading-7 text-[#575c56] sm:text-xl sm:leading-8">
              A complete 30-day strategy, content calendar and ready-made video
              campaign - built around your business in minutes.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?mode=signup" className="button-primary">
                Generate my marketing system
                <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="button-secondary">
                View product preview
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold text-[#696e68]">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#695cff]" />
                No prompts to write
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#695cff]" />
                Ready to publish
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#695cff]" />
                Built for your timezone
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[490px]">
            <div className="absolute -left-8 top-16 hidden rotate-[-8deg] rounded-2xl bg-[#d9ff43] p-4 shadow-xl sm:block">
              <Zap size={20} />
              <p className="mt-7 text-[11px] font-black uppercase tracking-widest">
                Your next move,
                <br />
                already decided.
              </p>
            </div>
            <div className="card relative overflow-hidden !bg-[#151615] p-3 text-white shadow-[0_35px_90px_rgba(18,20,18,.22)] sm:p-4">
              <div className="mb-3 flex items-center justify-between px-2 py-1">
                <div>
                  <p className="text-[11px] font-black tracking-[0.14em] text-white/45 uppercase">
                    Campaign dashboard
                  </p>
                  <p className="mt-1 font-bold">July growth plan</p>
                </div>
                <span className="rounded-full bg-[#d9ff43] px-3 py-1 text-[10px] font-black text-[#121412]">
                  82% READY
                </span>
              </div>
              <div className="rounded-[20px] bg-[#f8f6f0] p-4 text-[#121412] sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black tracking-wider text-[#797e77] uppercase">
                      Next best action
                    </p>
                    <p className="mt-1 text-lg font-black">Publish proof reel</p>
                  </div>
                  <div className="grid size-11 place-items-center rounded-full bg-[#695cff] text-white">
                    <Play size={16} fill="currentColor" />
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl bg-[#d9ff43]">
                  <div className="relative aspect-[16/9] bg-[radial-gradient(circle_at_20%_20%,#ffffff_0,transparent_26%),linear-gradient(135deg,#d9ff43,#97df35)] p-5">
                    <span className="rounded-full bg-black/10 px-3 py-1 text-[10px] font-black">
                      VIDEO 01
                    </span>
                    <p className="display absolute bottom-5 left-5 max-w-[250px] text-3xl leading-[.95]">
                      Stop losing leads after the first click.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#656a64]">
                    <Clock3 size={15} />
                    Today at 18:30 / Europe/Belgrade
                  </div>
                  <button className="grid size-9 place-items-center rounded-full bg-[#121412] text-white">
                    <Download size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["30", "Posts"],
                  ["05", "Emails"],
                  ["05", "Videos"]
                ].map(([number, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <p className="display text-3xl">{number}</p>
                    <p className="text-[10px] font-bold text-white/45">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="deliverables" className="py-24 sm:py-32">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <span className="eyebrow">One input. A complete system.</span>
              <h2 className="display mt-5 text-5xl leading-[0.96] sm:text-7xl">
                From blank page to clear direction.
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-[#626761]">
                Your company profile becomes reusable Business Memory. Every
                monthly campaign stays consistent with your offer, audience and
                voice.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {deliverables.map(([title, copy, Icon], index) => (
                <article
                  key={title}
                  className={`card min-h-[230px] p-6 ${
                    index === 1 ? "!bg-[#695cff] text-white" : ""
                  }`}
                >
                  <div
                    className={`grid size-11 place-items-center rounded-2xl ${
                      index === 1
                        ? "bg-white/15"
                        : "bg-[#ece9df] text-[#695cff]"
                    }`}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-10 text-xl font-black">{title}</h3>
                  <p
                    className={`mt-2 text-sm leading-6 ${
                      index === 1 ? "text-white/70" : "text-[#696e68]"
                    }`}
                  >
                    {copy}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="noise relative overflow-hidden bg-[#171817] py-24 text-white sm:py-32"
      >
        <div className="absolute right-0 top-0 size-[500px] rounded-full bg-[#695cff]/25 blur-3xl" />
        <div className="shell relative">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div className="max-w-xl">
              <span className="eyebrow !text-white/55">Smart release calendar</span>
              <h2 className="display mt-5 text-5xl leading-[.95] sm:text-7xl">
                Marketing that tells you when to move.
              </h2>
              <p className="mt-6 text-base leading-7 text-white/60">
                The first entitled video is ready immediately. The rest are
                released around recommended local posting times so the plan is
                easier to follow - not harder to own.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  "No third-party watermark",
                  "Optional client logo",
                  "Unlock all anytime"
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/75"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[.15em] text-white/35 uppercase">
                    This week
                  </p>
                  <p className="mt-1 text-lg font-black">Recommended schedule</p>
                </div>
                <CalendarDays className="text-[#d9ff43]" />
              </div>
              <div className="grid gap-2">
                {timeline.map((item, index) => (
                  <div
                    key={item.day}
                    className="grid grid-cols-[66px_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-black/15 p-3"
                  >
                    <span className="text-[10px] font-black tracking-wider text-white/35">
                      {item.day}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-1 text-[11px] text-white/35">
                        Instagram / {item.time}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[9px] font-black ${
                        index === 0
                          ? "bg-[#d9ff43] text-[#121412]"
                          : "bg-white/8 text-white/55"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 p-4 text-xs font-black text-white/60">
                <Download size={14} />
                Unlock all entitled videos
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="shell">
          <div className="mb-12 text-center">
            <span className="eyebrow">How it works</span>
            <h2 className="display mx-auto mt-5 max-w-3xl text-5xl leading-[.96] sm:text-7xl">
              Three steps between uncertainty and execution.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              [
                "01",
                "Tell us about the business",
                "Offer, audience, goal, location, voice and current channels.",
                MousePointer2
              ],
              [
                "02",
                "Review the decisions",
                "Approve positioning and campaign direction before content is produced.",
                Target
              ],
              [
                "03",
                "Execute the calendar",
                "Copy, download and publish each asset at the recommended local time.",
                CalendarDays
              ]
            ].map(([number, title, copy, Icon]) => {
              const StepIcon = Icon as typeof MousePointer2;
              return (
                <article key={number as string} className="card p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="display text-5xl text-[#695cff]">{number as string}</span>
                    <StepIcon size={21} className="text-[#7a7f78]" />
                  </div>
                  <h3 className="mt-10 text-xl font-black">{title as string}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#666b64]">{copy as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Pricing />

      <section className="bg-[#695cff] py-20 text-white sm:py-28">
        <div className="shell text-center">
          <Mail className="mx-auto text-[#d9ff43]" size={28} />
          <h2 className="display mx-auto mt-6 max-w-4xl text-5xl leading-[.94] sm:text-8xl">
            Stop wondering what marketing should happen next.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/70">
            Join the private beta and build your first complete marketing system.
          </p>
          <Link
            href="/login?mode=signup"
            className="button-primary mt-8 !border-[#d9ff43] !bg-[#d9ff43] !text-[#121412]"
          >
            Build my plan
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/10 py-8">
        <div className="shell flex flex-col items-center justify-between gap-4 text-xs text-[#727770] sm:flex-row">
          <p>Copyright 2026 Campaignova. Your AI Marketing Director.</p>
          <div className="flex gap-5">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:hello@campaignova.com">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
