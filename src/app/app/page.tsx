import type { Metadata } from "next";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Library,
  Mail,
  MessageSquareQuote,
  MoreHorizontal,
  Play,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand-mark";
import { CalendarPanel } from "@/components/calendar-panel";
import { EmailCampaignPanel } from "@/components/email-campaign-panel";
import { ExecutionReviewPanel } from "@/components/execution-review-panel";
import { LandingPagePanel } from "@/components/landing-page-panel";
import { PostsPanel } from "@/components/posts-panel";
import { ReadyVideosPanel } from "@/components/ready-videos-panel";
import { SalesPitchPanel } from "@/components/sales-pitch-panel";
import { StrategyPanel } from "@/components/strategy-panel";
import {
  getAiUsageSummary,
  type AiUsageSummary
} from "@/lib/ai-usage";
import { hasSupabaseConfig } from "@/lib/env";
import { PLAN_LIMITS, type PlanName } from "@/lib/plans";
import {
  contentCalendarSchema,
  type ContentCalendar
} from "@/lib/schemas/calendar";
import {
  generatedEmailCampaignSchema,
  type GeneratedEmailCampaign
} from "@/lib/schemas/emails";
import {
  generatedPostsSchema,
  type GeneratedPosts
} from "@/lib/schemas/posts";
import {
  landingPageSchema,
  type LandingPage
} from "@/lib/schemas/landing-page";
import {
  kpiExecutionReviewSchema,
  type KpiExecutionReview
} from "@/lib/schemas/kpis";
import {
  marketingStrategySchema,
  type MarketingStrategy
} from "@/lib/schemas/strategy";
import {
  salesPitchSchema,
  type SalesPitch
} from "@/lib/schemas/sales-pitch";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard"
};

const navItems = [
  ["Overview", LayoutDashboard, true],
  ["Marketing plans", FileText, false],
  ["Release calendar", CalendarDays, false],
  ["Video library", Library, false],
  ["Business memory", Users, false],
  ["Analytics", BarChart3, false]
] as const;

export default async function DashboardPage() {
  const planMonth = `${new Date().toISOString().slice(0, 7)}-01`;
  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${planMonth}T00:00:00Z`));
  let companyName = "Your company";
  let fullName = "Campaignova user";
  let firstName = "there";
  let initials = "CV";
  let companyTone = "Brand voice";
  let companyLocation = "Your market";
  let companyGoal = "Growth";
  let companyIndustry = "Business";
  let companyTimezone = "UTC";
  let subscriptionPlan = "starter";
  let companyId = "";
  let planId: string | null = null;
  let initialStrategy: MarketingStrategy | null = null;
  let initialCalendar: ContentCalendar | null = null;
  let initialPosts: GeneratedPosts | null = null;
  let initialEmails: GeneratedEmailCampaign | null = null;
  let initialLandingPage: LandingPage | null = null;
  let initialSalesPitch: SalesPitch | null = null;
  let initialExecutionReview: KpiExecutionReview | null = null;
  let assignedVideoCount = 0;
  let isAdmin = false;
  let aiUsage: AiUsageSummary = {
    requestsUsed: 0,
    requestLimit: PLAN_LIMITS.starter.aiRequests,
    requestsRemaining: PLAN_LIMITS.starter.aiRequests,
    regenerationsUsed: 0,
    regenerationLimit: PLAN_LIMITS.starter.regenerations,
    regenerationsRemaining: PLAN_LIMITS.starter.regenerations
  };

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const ownerId = data?.claims?.sub;

    if (!ownerId) {
      redirect("/login");
    }

    const [{ data: profile }, { data: company }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name,timezone,subscription_plan,app_role")
        .eq("id", ownerId)
        .single(),
      supabase
        .from("companies")
        .select("id,name,industry,tone,location,primary_goal")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (!company) {
      redirect("/onboarding");
    }

    fullName =
      profile?.full_name ||
      String(data.claims.email ?? "Campaignova user").split("@")[0];
    firstName = fullName.split(/\s+/)[0] || "there";
    initials =
      fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "CV";
    companyName = company.name;
    companyTone = company.tone;
    companyLocation = company.location;
    companyGoal = company.primary_goal;
    companyIndustry = company.industry;
    companyId = company.id;
    companyTimezone = profile?.timezone || "UTC";
    isAdmin = profile?.app_role === "admin";
    subscriptionPlan =
      profile?.subscription_plan &&
      profile.subscription_plan in PLAN_LIMITS
        ? profile.subscription_plan
        : "starter";
    aiUsage = await getAiUsageSummary(
      ownerId,
      subscriptionPlan as PlanName
    );

    const { data: latestPlan } = await supabase
      .from("marketing_plans")
      .select(
        "id,strategy,content_calendar,posts,emails,landing_page,sales_pitch,kpis"
      )
      .eq("company_id", companyId)
      .eq("month", planMonth)
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();
    const parsedStrategy = marketingStrategySchema.safeParse(
      latestPlan?.strategy
    );
    initialStrategy = parsedStrategy.success ? parsedStrategy.data : null;
    planId = latestPlan?.id ?? null;
    const parsedCalendar = contentCalendarSchema.safeParse(
      latestPlan?.content_calendar
    );
    initialCalendar = parsedCalendar.success ? parsedCalendar.data : null;
    const parsedPosts = generatedPostsSchema.safeParse(latestPlan?.posts);
    initialPosts = parsedPosts.success ? parsedPosts.data : null;
    const parsedEmails = generatedEmailCampaignSchema.safeParse(
      latestPlan?.emails
    );
    initialEmails = parsedEmails.success ? parsedEmails.data : null;
    const parsedLandingPage = landingPageSchema.safeParse(
      latestPlan?.landing_page
    );
    initialLandingPage = parsedLandingPage.success
      ? parsedLandingPage.data
      : null;
    const parsedSalesPitch = salesPitchSchema.safeParse(
      latestPlan?.sales_pitch
    );
    initialSalesPitch = parsedSalesPitch.success
      ? parsedSalesPitch.data
      : null;
    const parsedExecutionReview = kpiExecutionReviewSchema.safeParse(
      latestPlan?.kpis
    );
    initialExecutionReview = parsedExecutionReview.success
      ? parsedExecutionReview.data
      : null;

    if (planId) {
      const { count } = await supabase
        .from("video_releases")
        .select("id", { count: "exact", head: true })
        .eq("marketing_plan_id", planId)
        .eq("owner_id", ownerId);
      assignedVideoCount = count ?? 0;
    }
  }

  const primaryItem = initialCalendar?.items[0] ?? null;
  const previewWeek = initialCalendar?.items.slice(0, 7) ?? [];
  const videoLimit =
    subscriptionPlan === "director" ? 30 : subscriptionPlan === "growth" ? 5 : 1;
  const videosReady = assignedVideoCount >= videoLimit;
  const planProgress = videosReady
    ? 100
    : initialSalesPitch
    ? 97
    : initialLandingPage
    ? 92
    : initialEmails
    ? 85
    : initialPosts
    ? 75
    : initialCalendar
      ? 50
      : initialStrategy
        ? 25
        : 10;
  const planLabel =
    subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1);
  const aiUsagePercent = Math.min(
    100,
    Math.round((aiUsage.requestsUsed / aiUsage.requestLimit) * 100)
  );
  const formatCalendarDate = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(
      new Date(`${date}T00:00:00Z`)
    );
  const calendarWeek = previewWeek.map((item, index) => ({
    ...item,
    day: formatCalendarDate(item.date, { day: "2-digit" }),
    week: formatCalendarDate(item.date, { weekday: "short" }).toUpperCase(),
    active: index === 0
  }));
  const calendarRange =
    previewWeek.length > 0
      ? `${formatCalendarDate(previewWeek[0].date, {
          month: "short",
          day: "numeric"
        })} - ${formatCalendarDate(previewWeek.at(-1)!.date, {
          month: "short",
          day: "numeric"
        })}`
      : "Calendar pending";

  return (
    <main className="min-h-screen bg-[#f4f2ec] lg:grid lg:grid-cols-[238px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-black/10 bg-[#faf8f3] px-4 py-5 lg:flex lg:flex-col">
        <div className="px-2">
          <BrandMark />
        </div>
        <nav className="mt-10 grid gap-1">
          {navItems.map(([label, Icon, active]) => (
            <button
              key={label}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-left text-[13px] font-bold ${
                active
                  ? "bg-[#121412] text-white"
                  : "text-[#656a64] hover:bg-black/5"
              }`}
            >
              <Icon size={17} className={active ? "text-[#d9ff43]" : ""} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <div className="mb-3 rounded-2xl bg-[#695cff] p-4 text-white">
            <p className="text-[10px] font-black tracking-wider text-white/60 uppercase">
              {planLabel} plan
            </p>
            <p className="mt-2 text-sm font-black">
              {initialExecutionReview
                ? "Execution review ready"
                : videosReady
                ? "Campaign package ready"
                : initialSalesPitch
                ? "Sales pitch ready"
                : initialLandingPage
                ? "Landing page ready"
                : initialEmails
                ? "Emails ready"
                : initialPosts
                ? "Posts ready"
                : initialCalendar
                  ? "Calendar ready"
                  : "Building campaign"}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#d9ff43]"
                style={{ width: `${planProgress}%` }}
              />
            </div>
            <div className="mt-4 border-t border-white/15 pt-3">
              <div className="flex items-center justify-between text-[10px] font-black tracking-wide uppercase">
                <span className="text-white/60">AI actions</span>
                <span>
                  {aiUsage.requestsUsed}/{aiUsage.requestLimit}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${aiUsagePercent}%` }}
                />
              </div>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-bold text-[#656a64]"
            >
              <Settings2 size={17} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="flex h-[74px] items-center justify-between border-b border-black/10 bg-[#faf8f3]/80 px-4 backdrop-blur sm:px-7">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-[#787d76]">{companyName}</p>
            <h1 className="mt-1 text-base font-black">
              Good morning, {firstName}.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden min-h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-[10px] font-black sm:flex"
              >
                <ShieldCheck size={14} className="text-[#695cff]" />
                Admin
              </Link>
            )}
            <div className="hidden rounded-full border border-black/10 bg-white px-3 py-2 text-[10px] font-black text-[#626760] sm:block">
              {aiUsage.requestsRemaining} AI actions left
            </div>
            <button className="grid size-10 place-items-center rounded-full border border-black/10 bg-white">
              <Bell size={17} />
            </button>
            <div className="grid size-10 place-items-center rounded-full bg-[#d9ff43] text-xs font-black">
              {initials}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1300px] px-4 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">{monthLabel} campaign</p>
              <h2 className="display mt-3 text-4xl leading-none sm:text-5xl">
                Your next best moves.
              </h2>
            </div>
            <Link href="/onboarding" className="button-primary !min-h-11 !px-4">
              <Plus size={16} />
              New plan
            </Link>
          </div>

          <StrategyPanel
            companyId={companyId}
            month={planMonth}
            initialStrategy={initialStrategy}
          />
          <CalendarPanel
            planId={planId}
            hasStrategy={Boolean(initialStrategy)}
            initialCalendar={initialCalendar}
          />
          <PostsPanel
            planId={planId}
            hasCalendar={Boolean(initialCalendar)}
            initialPosts={initialPosts}
          />
          <EmailCampaignPanel
            planId={planId}
            hasPosts={Boolean(initialPosts)}
            initialCampaign={initialEmails}
          />
          <LandingPagePanel
            planId={planId}
            hasEmails={Boolean(initialEmails)}
            initialPage={initialLandingPage}
          />
          <SalesPitchPanel
            planId={planId}
            hasLandingPage={Boolean(initialLandingPage)}
            initialPitch={initialSalesPitch}
          />
          <ReadyVideosPanel
            planId={planId}
            hasSalesPitch={Boolean(initialSalesPitch)}
            entitlement={videoLimit}
          />
          <ExecutionReviewPanel
            planId={planId}
            videosReady={videosReady}
            videoEntitlement={videoLimit}
            initialReview={initialExecutionReview}
            month={planMonth}
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
            <article className="card overflow-hidden !bg-[#171817] p-4 text-white sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black tracking-[.15em] text-[#d9ff43] uppercase">
                    {primaryItem ? "First calendar move" : "Next campaign step"}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    {primaryItem?.topic ?? "Build the 30-day calendar"}
                  </h3>
                  <p className="mt-2 text-sm text-white/50">
                    {primaryItem
                      ? `${primaryItem.platform} / ${primaryItem.publishTimeLocal} local time`
                      : "Approve the strategy before content production begins."}
                  </p>
                </div>
                <button className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5">
                  <MoreHorizontal size={17} />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-[1.05fr_.95fr]">
                <div className="relative min-h-[245px] overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_22%_18%,#fff_0,transparent_25%),linear-gradient(135deg,#d9ff43,#78d45b)] p-5 text-[#121412]">
                  <span className="rounded-full bg-black/10 px-3 py-1 text-[9px] font-black uppercase">
                    {primaryItem
                      ? `Day ${primaryItem.dayNumber} / ${primaryItem.format}`
                      : "Calendar pending"}
                  </span>
                  <p className="display absolute bottom-6 left-5 max-w-[300px] text-4xl leading-[.92]">
                    {primaryItem?.hook ??
                      "Strategy first. Execution follows approved decisions."}
                  </p>
                  <button className="absolute right-5 top-5 grid size-12 place-items-center rounded-full bg-[#121412] text-white">
                    {primaryItem?.videoTheme ? (
                      <Play size={17} fill="currentColor" />
                    ) : (
                      <FileText size={17} />
                    )}
                  </button>
                </div>
                <div className="flex flex-col rounded-2xl bg-white/6 p-5">
                  <div className="flex items-center gap-2 text-[11px] font-black text-white/40 uppercase">
                    <Clock3 size={14} />
                    {companyTimezone}
                  </div>
                  <p className="mt-5 text-sm leading-6 text-white/75">
                    {primaryItem?.angle ??
                      "Campaignova will turn the approved strategy into a sequenced month of content."}
                  </p>
                  <div className="mt-5 rounded-xl border border-white/8 p-3 text-xs text-white/45">
                    CTA: {primaryItem?.callToAction ?? "Approve and build the calendar"}
                  </div>
                  <button className="mt-auto flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#d9ff43] px-4 text-xs font-black text-[#121412]">
                    <CalendarDays size={15} />
                    {primaryItem ? "Open content details" : "Continue campaign setup"}
                  </button>
                </div>
              </div>
            </article>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <article className="card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black tracking-wider text-[#777c75] uppercase">
                    Plan health
                  </p>
                  <CheckCircle2 size={18} className="text-[#695cff]" />
                </div>
                <div className="mt-5 flex items-end gap-2">
                  <span className="display text-6xl">{planProgress}%</span>
                  <span className="pb-2 text-xs font-bold text-[#777c75]">ready</span>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/8">
                  <div
                    className="h-full rounded-full bg-[#695cff]"
                    style={{ width: `${planProgress}%` }}
                  />
                </div>
                <p className="mt-4 text-xs leading-5 text-[#6b706a]">
                  {initialExecutionReview
                    ? "The complete campaign package and execution review are ready. Use the review to build the next monthly plan."
                    : videosReady
                    ? "The complete marketing, sales and ready-video package is assigned. KPI and execution review are next."
                    : initialSalesPitch
                    ? "The core marketing and sales package is complete. Ready-video assignment and execution review are next."
                    : initialLandingPage
                    ? "Strategy, calendar, social posts, email campaign and landing page copy are complete. Sales pitch production is next."
                    : initialEmails
                    ? "Strategy, calendar, social posts and the five-email campaign are complete. Landing page production is next."
                    : initialPosts
                    ? "Strategy, calendar and 30 publishable posts are complete. Email production is next."
                    : initialCalendar
                    ? "Strategy and the 30-day calendar are complete. Content production is next."
                    : initialStrategy
                      ? "Strategy is complete and ready to become a 30-day calendar."
                      : "Business Memory is ready. Generate the strategy to continue."}
                </p>
              </article>
              <article className="card p-5">
                <p className="text-[11px] font-black tracking-wider text-[#777c75] uppercase">
                  Business memory
                </p>
                <h3 className="mt-4 text-lg font-black">{companyName}</h3>
                <p className="mt-1 text-xs text-[#737872]">
                  {companyTone} / {companyLocation}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {[companyGoal, companyIndustry, "Business Memory"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#ece9df] px-3 py-1.5 text-[10px] font-black"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="mt-5 flex items-center gap-1 text-xs font-black text-[#695cff]">
                  Review memory
                  <ChevronRight size={14} />
                </button>
              </article>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <article className="card p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black tracking-wider text-[#777c75] uppercase">
                    Release calendar
                  </p>
                  <h3 className="mt-1 text-xl font-black">{calendarRange}</h3>
                </div>
                <button className="button-secondary !min-h-9 !px-3 !text-[11px]">
                  Full calendar
                  <ArrowUpRight size={13} />
                </button>
              </div>
              <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarWeek.map((item) => (
                  <div
                    key={item.date}
                    className={`relative grid min-h-20 place-items-center rounded-2xl border text-center sm:min-h-24 ${
                      item.active
                        ? "border-[#695cff] bg-[#695cff] text-white"
                        : "border-black/8 bg-white"
                    }`}
                  >
                    <div>
                      <p
                        className={`text-[8px] font-black tracking-wider sm:text-[9px] ${
                          item.active ? "text-white/55" : "text-[#8a8f88]"
                        }`}
                      >
                        {item.week}
                      </p>
                      <p className="display mt-1 text-2xl sm:text-3xl">{item.day}</p>
                    </div>
                    {item.videoTheme && (
                      <span className="absolute bottom-2 size-1.5 rounded-full bg-[#d9ff43]" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-2">
                {previewWeek.slice(0, 2).map((item, index) => (
                  <div
                    key={item.date}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-[#efede6] p-3"
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-xl ${
                        index === 0
                          ? "bg-[#d9ff43] text-[#121412]"
                          : "bg-[#695cff] text-white"
                      }`}
                    >
                      {index === 0 ? <FileText size={15} /> : <Play size={15} />}
                    </span>
                    <div>
                      <p className="text-xs font-black">{item.topic}</p>
                      <p className="mt-1 text-[10px] text-[#777c75]">
                        Day {item.dayNumber} / {item.publishTimeLocal}
                      </p>
                    </div>
                    <span className="hidden text-[10px] font-bold text-[#777c75] sm:block">
                      {item.platform}
                    </span>
                  </div>
                ))}
                {previewWeek.length === 0 && (
                  <div className="rounded-2xl bg-[#efede6] p-4 text-xs text-[#777c75]">
                    Approve the strategy to generate the first seven scheduled moves.
                  </div>
                )}
              </div>
            </article>

            <article className="card p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black tracking-wider text-[#777c75] uppercase">
                    Campaign output
                  </p>
                  <h3 className="mt-1 text-xl font-black">Your package</h3>
                </div>
                <Sparkles className="text-[#695cff]" size={20} />
              </div>
              <div className="mt-6 grid gap-2">
                {[
                  [
                    "Strategy",
                    initialStrategy ? "Complete" : "Not started",
                    Target,
                    initialStrategy ? "Ready" : "0%"
                  ],
                  [
                    "Content calendar",
                    initialCalendar ? "30 days ready" : "Pending approval",
                    CalendarDays,
                    initialCalendar ? "Ready" : "Next"
                  ],
                  [
                    "Social posts",
                    initialPosts ? "30 posts ready" : "Next production stage",
                    FileText,
                    initialPosts ? "Ready" : "0%"
                  ],
                  [
                    "Email campaign",
                    initialEmails ? "5 emails ready" : "Queued after posts",
                    Mail,
                    initialEmails ? "Ready" : "0%"
                  ],
                  [
                    "Landing page",
                    initialLandingPage
                      ? "Conversion copy ready"
                      : "Queued after emails",
                    LayoutTemplate,
                    initialLandingPage ? "Ready" : "0%"
                  ],
                  [
                    "Sales pitch",
                    initialSalesPitch
                      ? "Conversation toolkit ready"
                      : "Queued after landing page",
                    MessageSquareQuote,
                    initialSalesPitch ? "Ready" : "0%"
                  ],
                  [
                    "Ready videos",
                    `${assignedVideoCount} of ${videoLimit} assigned`,
                    Play,
                    videosReady
                      ? "Ready"
                      : `${Math.round(
                          (assignedVideoCount / videoLimit) * 100
                        )}%`
                  ],
                  [
                    "Execution review",
                    initialExecutionReview
                      ? `${initialExecutionReview.review.score}/100 - ${initialExecutionReview.review.status}`
                      : "Waiting for campaign results",
                    BarChart3,
                    initialExecutionReview ? "Ready" : "Next"
                  ]
                ].map(([title, detail, Icon, progress]) => {
                  const OutputIcon = Icon as typeof Target;
                  return (
                    <button
                      key={title as string}
                      className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3 text-left"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-[#efede6] text-[#695cff]">
                        <OutputIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-black">{title as string}</span>
                        <span className="mt-1 block text-[10px] text-[#777c75]">
                          {detail as string}
                        </span>
                      </span>
                      <span className="text-[10px] font-black text-[#777c75]">
                        {progress as string}
                      </span>
                      <ChevronRight size={14} className="text-[#92968f]" />
                    </button>
                  );
                })}
              </div>
              {planId ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <a
                    href={`/api/plans/export?planId=${encodeURIComponent(planId)}`}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 py-3 text-xs font-black transition hover:border-[#695cff] hover:text-[#695cff]"
                  >
                    <Download size={14} />
                    Download PDF
                  </a>
                  <a
                    href={`/api/plans/export-pptx?planId=${encodeURIComponent(planId)}`}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-black/10 py-3 text-xs font-black transition hover:border-[#695cff] hover:text-[#695cff]"
                  >
                    <Download size={14} />
                    Download PPTX
                  </a>
                </div>
              ) : (
                <button
                  className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-black/10 py-3 text-xs font-black text-[#9a9f98]"
                  disabled
                  type="button"
                >
                  <Download size={14} />
                  Generate strategy before export
                </button>
              )}
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
