import pptxgen from "pptxgenjs";
import { contentCalendarSchema } from "@/lib/schemas/calendar";
import { generatedEmailCampaignSchema } from "@/lib/schemas/emails";
import { kpiExecutionReviewSchema } from "@/lib/schemas/kpis";
import { landingPageSchema } from "@/lib/schemas/landing-page";
import { generatedPostsSchema } from "@/lib/schemas/posts";
import { salesPitchSchema } from "@/lib/schemas/sales-pitch";
import { marketingStrategySchema } from "@/lib/schemas/strategy";

type Presentation = InstanceType<typeof pptxgen>;
type Slide = ReturnType<Presentation["addSlide"]>;

export type MarketingPlanPptxCompany = {
  name: string;
  industry: string;
  offer: string;
  price_context: string | null;
  audience: string;
  location: string;
  language: string;
  tone: string;
  primary_goal: string;
  primary_cta: string;
  website_url: string | null;
  competitors: string[] | null;
  monthly_budget: number | string | null;
  differentiator: string | null;
  active_channels: string[] | null;
};

export type MarketingPlanPptxPlan = {
  id: string;
  month: string;
  status: string;
  strategy: unknown;
  content_calendar: unknown;
  posts: unknown;
  emails: unknown;
  landing_page: unknown;
  sales_pitch: unknown;
  kpis: unknown;
  updated_at: string;
};

export type MarketingPlanPptxVideoRelease = {
  title: string;
  durationSeconds: number | null;
  platform: string;
  caption: string;
  callToAction: string;
  releaseAt: string;
  publishAt: string;
  status: string;
};

export type MarketingPlanPptxInput = {
  company: MarketingPlanPptxCompany;
  plan: MarketingPlanPptxPlan;
  timezone: string;
  subscriptionPlan: string;
  videos: MarketingPlanPptxVideoRelease[];
  generatedAt: string;
};

const W = 13.333;
const H = 7.5;
const M = 0.55;
const COLORS = {
  ink: "121412",
  muted: "626760",
  faint: "EFEDE6",
  paper: "F7F4EC",
  purple: "695CFF",
  lime: "D9FF43",
  dark: "171817",
  white: "FFFFFF",
  line: "D8D2C2"
};

function asciiText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u00A0/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shortText(value: unknown, max = 145) {
  const text = asciiText(value).replace(/\s+/g, " ");

  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, Math.max(0, max - 3)).trimEnd()}...`;
}

function listText(values: unknown[] | null | undefined) {
  const clean = (values ?? []).map(asciiText).filter(Boolean);
  return clean.length > 0 ? clean.join(", ") : "Not specified";
}

function moneyText(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "Not specified";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return asciiText(value);
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatMonth(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return asciiText(value);
  }

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return asciiText(value);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatDateTime(value: string, timezone: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return asciiText(value);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || "UTC"
  }).format(date);
}

function parsePlan(input: MarketingPlanPptxInput) {
  const strategy = marketingStrategySchema.safeParse(input.plan.strategy);
  const calendar = contentCalendarSchema.safeParse(
    input.plan.content_calendar
  );
  const posts = generatedPostsSchema.safeParse(input.plan.posts);
  const emails = generatedEmailCampaignSchema.safeParse(input.plan.emails);
  const landingPage = landingPageSchema.safeParse(input.plan.landing_page);
  const salesPitch = salesPitchSchema.safeParse(input.plan.sales_pitch);
  const kpis = kpiExecutionReviewSchema.safeParse(input.plan.kpis);

  return {
    strategy: strategy.success ? strategy.data : null,
    calendar: calendar.success ? calendar.data : null,
    posts: posts.success ? posts.data : null,
    emails: emails.success ? emails.data : null,
    landingPage: landingPage.success ? landingPage.data : null,
    salesPitch: salesPitch.success ? salesPitch.data : null,
    kpis: kpis.success ? kpis.data : null
  };
}

function addFooter(slide: Slide, input: MarketingPlanPptxInput, slideNo: number) {
  slide.addText(`Campaignova / ${shortText(input.company.name, 40)}`, {
    x: M,
    y: 7.12,
    w: 5.6,
    h: 0.18,
    fontFace: "Aptos",
    fontSize: 8,
    color: COLORS.muted,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
  slide.addText(String(slideNo).padStart(2, "0"), {
    x: 12.25,
    y: 7.07,
    w: 0.5,
    h: 0.24,
    fontFace: "Aptos",
    fontSize: 9,
    bold: true,
    color: COLORS.muted,
    margin: 0,
    align: "right",
    breakLine: false
  });
}

function addEyebrow(slide: Slide, label: string, dark = false) {
  slide.addText(asciiText(label).toUpperCase(), {
    x: M,
    y: 0.38,
    w: 5.8,
    h: 0.22,
    fontFace: "Aptos",
    fontSize: 9,
    bold: true,
    charSpacing: 1.3,
    color: dark ? COLORS.lime : COLORS.purple,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
}

function addTitle(slide: Slide, title: string, subtitle?: string) {
  slide.addText(shortText(title, 78), {
    x: M,
    y: 0.78,
    w: 11.8,
    h: 0.58,
    fontFace: "Aptos Display",
    fontSize: 35,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });

  if (subtitle) {
    slide.addText(shortText(subtitle, 180), {
      x: M,
      y: 1.42,
      w: 10.7,
      h: 0.42,
      fontFace: "Aptos",
      fontSize: 16,
      color: COLORS.muted,
      margin: 0,
      fit: "shrink"
    });
  }
}

function addBaseSlide(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number,
  title: string,
  eyebrow: string,
  subtitle?: string
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.paper };
  addEyebrow(slide, eyebrow);
  addTitle(slide, title, subtitle);
  addFooter(slide, input, slideNo);
  return slide;
}

function addCard(
  slide: Slide,
  opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    body: string;
    fill?: string;
    titleColor?: string;
    bodyColor?: string;
    fontSize?: number;
  }
) {
  slide.addShape("roundRect", {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    rectRadius: 0.08,
    fill: { color: opts.fill ?? COLORS.white },
    line: { color: COLORS.line, transparency: opts.fill ? 100 : 0 }
  });
  slide.addText(shortText(opts.title, 62), {
    x: opts.x + 0.18,
    y: opts.y + 0.16,
    w: opts.w - 0.36,
    h: 0.3,
    fontFace: "Aptos",
    fontSize: 10,
    bold: true,
    charSpacing: 0.8,
    color: opts.titleColor ?? COLORS.purple,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
  slide.addText(shortText(opts.body, 270), {
    x: opts.x + 0.18,
    y: opts.y + 0.55,
    w: opts.w - 0.36,
    h: opts.h - 0.72,
    fontFace: "Aptos",
    fontSize: opts.fontSize ?? 16,
    color: opts.bodyColor ?? COLORS.ink,
    margin: 0,
    fit: "shrink",
    breakLine: false
  });
}

function addMetricCard(
  slide: Slide,
  x: number,
  title: string,
  value: string,
  detail: string,
  fill = COLORS.lime
) {
  slide.addShape("roundRect", {
    x,
    y: 4.9,
    w: 3.9,
    h: 1.3,
    rectRadius: 0.1,
    fill: { color: fill },
    line: { color: fill }
  });
  slide.addText(asciiText(title).toUpperCase(), {
    x: x + 0.25,
    y: 5.12,
    w: 3.3,
    h: 0.2,
    fontSize: 9,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    breakLine: false
  });
  slide.addText(shortText(value, 28), {
    x: x + 0.25,
    y: 5.45,
    w: 1.2,
    h: 0.38,
    fontSize: 24,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
  slide.addText(shortText(detail, 70), {
    x: x + 1.45,
    y: 5.48,
    w: 2.2,
    h: 0.42,
    fontSize: 11,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink"
  });
}

function addBulletList(
  slide: Slide,
  values: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize = 17
) {
  const text = values
    .map((value) => asciiText(value))
    .filter(Boolean)
    .map((value) => `- ${value}`)
    .join("\n");

  slide.addText(shortText(text, 900), {
    x,
    y,
    w,
    h,
    fontFace: "Aptos",
    fontSize,
    color: COLORS.ink,
    breakLine: false,
    margin: 0.02,
    fit: "shrink"
  });
}

function addMissing(slide: Slide, section: string) {
  addCard(slide, {
    x: 1.35,
    y: 2.55,
    w: 10.6,
    h: 1.5,
    title: `${section} pending`,
    body: "Generate this stage in the dashboard, then export the PowerPoint again.",
    fill: COLORS.faint,
    fontSize: 19
  });
}

function buildCover(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  completeSections: number
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.dark };
  addEyebrow(slide, "Campaignova Marketing Director", true);
  slide.addText(shortText(input.company.name, 64), {
    x: M,
    y: 1.25,
    w: 10.8,
    h: 0.82,
    fontFace: "Aptos Display",
    fontSize: 50,
    bold: true,
    color: COLORS.white,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
  slide.addText(`${formatMonth(input.plan.month)} marketing plan`, {
    x: M,
    y: 2.15,
    w: 8.4,
    h: 0.38,
    fontSize: 24,
    color: COLORS.lime,
    margin: 0,
    breakLine: false
  });
  slide.addText(shortText(input.company.offer, 260), {
    x: M,
    y: 3.05,
    w: 8.8,
    h: 0.9,
    fontSize: 17,
    color: "DCE0DA",
    margin: 0,
    fit: "shrink"
  });
  addMetricCard(slide, M, "Plan", input.subscriptionPlan, "Current account tier");
  addMetricCard(slide, 4.7, "Sections ready", `${completeSections}/7`, "Included in deck");
  addMetricCard(slide, 8.85, "Videos", String(input.videos.length), "Assigned releases");
  slide.addNotes(
    asciiText(
      `Campaignova generated this presentation for ${input.company.name}. Company offer: ${input.company.offer}`
    )
  );
  return slide;
}

function buildBusinessMemory(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number
) {
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Business Memory",
    "Inputs",
    "The business context used to generate the campaign."
  );
  addCard(slide, {
    x: M,
    y: 2.05,
    w: 3.9,
    h: 1.25,
    title: "Industry",
    body: input.company.industry,
    fill: COLORS.white
  });
  addCard(slide, {
    x: 4.72,
    y: 2.05,
    w: 3.9,
    h: 1.25,
    title: "Market",
    body: input.company.location,
    fill: COLORS.white
  });
  addCard(slide, {
    x: 8.9,
    y: 2.05,
    w: 3.9,
    h: 1.25,
    title: "Tone",
    body: input.company.tone,
    fill: COLORS.white
  });
  addCard(slide, {
    x: M,
    y: 3.55,
    w: 5.95,
    h: 1.4,
    title: "Audience",
    body: input.company.audience,
    fill: COLORS.white,
    fontSize: 15
  });
  addCard(slide, {
    x: 6.85,
    y: 3.55,
    w: 5.95,
    h: 1.4,
    title: "Primary goal",
    body: input.company.primary_goal,
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: M,
    y: 5.2,
    w: 5.95,
    h: 1.15,
    title: "CTA",
    body: input.company.primary_cta,
    fill: COLORS.lime,
    fontSize: 16
  });
  addCard(slide, {
    x: 6.85,
    y: 5.2,
    w: 5.95,
    h: 1.15,
    title: "Budget and channels",
    body: `${moneyText(input.company.monthly_budget)} / ${listText(
      input.company.active_channels
    )}`,
    fill: COLORS.white,
    fontSize: 15
  });
  slide.addNotes(
    asciiText(
      `Offer: ${input.company.offer}\nAudience: ${input.company.audience}\nDifferentiator: ${input.company.differentiator ?? "Not specified"}`
    )
  );
}

function buildStrategySlides(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNoStart: number,
  strategy: ReturnType<typeof parsePlan>["strategy"]
) {
  let slideNo = slideNoStart;
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Strategy Direction",
    "Decision layer",
    "The core campaign decisions before production."
  );

  if (!strategy) {
    addMissing(slide, "Marketing strategy");
    return 1;
  }

  addCard(slide, {
    x: M,
    y: 2.05,
    w: 5.85,
    h: 1.35,
    title: "Key message",
    body: strategy.keyMessage,
    fill: COLORS.lime,
    fontSize: 18
  });
  addCard(slide, {
    x: 6.95,
    y: 2.05,
    w: 5.85,
    h: 1.35,
    title: "Campaign objective",
    body: strategy.campaignObjective,
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: M,
    y: 3.65,
    w: 5.85,
    h: 1.55,
    title: "Positioning",
    body: strategy.positioning,
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: 6.95,
    y: 3.65,
    w: 5.85,
    h: 1.55,
    title: "Core offer",
    body: strategy.coreOffer,
    fill: COLORS.white,
    fontSize: 16
  });
  slide.addText(shortText(strategy.executiveSummary, 260), {
    x: M,
    y: 5.55,
    w: 12.1,
    h: 0.74,
    fontSize: 16,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink"
  });
  slide.addNotes(asciiText(strategy.executiveSummary));

  slideNo += 1;
  const channels = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Channel Priorities",
    "Distribution plan",
    "Each channel gets a clear role in the campaign."
  );
  strategy.channelPriorities.slice(0, 3).forEach((channel, index) => {
    addCard(channels, {
      x: M + index * 4.15,
      y: 2.12,
      w: 3.85,
      h: 3.75,
      title: channel.channel,
      body: `${channel.cadence}\n\n${channel.role}\n\nWhy: ${shortText(
        channel.rationale,
        85
      )}`,
      fill: index === 0 ? COLORS.lime : COLORS.white,
      fontSize: 16
    });
  });
  channels.addNotes(
    asciiText(
      strategy.channelPriorities
        .map((item) => `${item.channel}: ${item.role} ${item.rationale}`)
        .join("\n\n")
    )
  );

  slideNo += 1;
  const pillars = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Content Pillars",
    "Message architecture",
    "Four repeatable angles for a month of content."
  );
  strategy.contentPillars.forEach((pillar, index) => {
    addCard(pillars, {
      x: M + (index % 2) * 6.25,
      y: 2.08 + Math.floor(index / 2) * 2.1,
      w: 5.9,
      h: 1.78,
      title: pillar.name,
      body: `${pillar.purpose}\nTopics: ${pillar.exampleTopics
        .slice(0, 2)
        .join("; ")}`,
      fill: index === 0 ? COLORS.lime : COLORS.white,
      fontSize: 16
    });
  });
  pillars.addNotes(
    asciiText(
      strategy.contentPillars
        .map((item) => `${item.name}: ${item.purpose}`)
        .join("\n")
    )
  );

  slideNo += 1;
  const kpiSlide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Success Metrics",
    "Targets and risks",
    "What the owner should track during the month."
  );
  strategy.kpis.forEach((kpi, index) => {
    addCard(kpiSlide, {
      x: M + index * 4.15,
      y: 2.05,
      w: 3.85,
      h: 1.55,
      title: kpi.name,
      body: `${kpi.target}\n${kpi.reason}`,
      fill: index === 0 ? COLORS.lime : COLORS.white,
      fontSize: 16
    });
  });
  addCard(kpiSlide, {
    x: M,
    y: 3.95,
    w: 5.95,
    h: 1.95,
    title: "Next actions",
    body: strategy.nextActions.join("\n"),
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(kpiSlide, {
    x: 6.85,
    y: 3.95,
    w: 5.95,
    h: 1.95,
    title: "Strategic risks",
    body: strategy.strategicRisks.join("\n"),
    fill: COLORS.white,
    fontSize: 16
  });
  kpiSlide.addNotes(
    asciiText(
      `KPIs:\n${strategy.kpis
        .map((item) => `${item.name}: ${item.target} - ${item.reason}`)
        .join("\n")}\n\nActions:\n${strategy.nextActions.join("\n")}`
    )
  );

  return 4;
}

function buildCalendarSlides(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNoStart: number,
  calendar: ReturnType<typeof parsePlan>["calendar"]
) {
  let slideNo = slideNoStart;
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Monthly Calendar",
    "30-day execution plan",
    "The campaign narrative and weekly objectives."
  );

  if (!calendar) {
    addMissing(slide, "Content calendar");
    return 1;
  }

  addCard(slide, {
    x: M,
    y: 2.05,
    w: 5.95,
    h: 1.45,
    title: "Monthly theme",
    body: calendar.monthlyTheme,
    fill: COLORS.lime,
    fontSize: 18
  });
  addCard(slide, {
    x: 6.85,
    y: 2.05,
    w: 5.95,
    h: 1.45,
    title: "Narrative",
    body: calendar.campaignNarrative,
    fill: COLORS.white,
    fontSize: 15
  });
  calendar.weeklyObjectives.forEach((week, index) => {
    addCard(slide, {
      x: M + index * 2.48,
      y: 3.9,
      w: 2.25,
      h: 1.65,
      title: `Week ${week.week}`,
      body: `${week.days}\n${week.objective}`,
      fill: COLORS.white,
      fontSize: 13
    });
  });
  slide.addNotes(asciiText(calendar.campaignNarrative));

  const calendarGroupSize = 3;
  for (let group = 0; group < 10; group += 1) {
    slideNo += 1;
    const startDay = group * calendarGroupSize + 1;
    const items = calendar.items.slice(
      group * calendarGroupSize,
      group * calendarGroupSize + calendarGroupSize
    );
    const groupSlide = addBaseSlide(
      pptx,
      input,
      slideNo,
      `Calendar Days ${startDay}-${startDay + items.length - 1}`,
      "Calendar appendix",
      "Recommended topic, platform, format and local publish time."
    );
    items.forEach((item, index) => {
      addCard(groupSlide, {
        x: M + index * 4.15,
        y: 2.05,
        w: 3.85,
        h: 3.95,
        title: `Day ${item.dayNumber} / ${formatDate(item.date)} / ${item.publishTimeLocal}`,
        body: `${item.platform} - ${item.format}\n${item.topic}\nCTA: ${item.callToAction}`,
        fill: item.videoTheme ? COLORS.lime : COLORS.white,
        fontSize: 16
      });
    });
    groupSlide.addNotes(
      asciiText(
        items
          .map(
            (item) =>
              `Day ${item.dayNumber}: ${item.topic}\nHook: ${item.hook}\nAngle: ${item.angle}\nCTA: ${item.callToAction}`
          )
          .join("\n\n")
      )
    );
  }

  return 11;
}

function buildPostSlides(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNoStart: number,
  posts: ReturnType<typeof parsePlan>["posts"]
) {
  let slideNo = slideNoStart;
  const overview = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Social Content Package",
    "30 publishable posts",
    "A practical appendix of post headlines and CTAs."
  );

  if (!posts) {
    addMissing(overview, "Social posts");
    return 1;
  }

  addBulletList(
    overview,
    posts.posts.slice(0, 8).map((post) => `Day ${post.dayNumber}: ${post.headline}`),
    M,
    2.05,
    12,
    3.55,
    18
  );
  overview.addNotes(
    asciiText(
      posts.posts
        .map((post) => `Day ${post.dayNumber}: ${post.caption}`)
        .join("\n\n")
    )
  );

  const postGroupSize = 3;
  for (let group = 0; group < 10; group += 1) {
    slideNo += 1;
    const startPost = group * postGroupSize + 1;
    const items = posts.posts.slice(
      group * postGroupSize,
      group * postGroupSize + postGroupSize
    );
    const groupSlide = addBaseSlide(
      pptx,
      input,
      slideNo,
      `Post Appendix ${startPost}-${startPost + items.length - 1}`,
      "Social appendix",
      "Headlines, platform choices, captions and CTAs."
    );
    items.forEach((post, index) => {
      addCard(groupSlide, {
        x: M + index * 4.15,
        y: 2.05,
        w: 3.85,
        h: 3.95,
        title: `Day ${post.dayNumber} / ${post.platform}`,
        body: `${post.headline}\nCTA: ${post.callToAction}\n${post.hashtags
          .slice(0, 4)
          .join(" ")}`,
        fill: post.videoScript ? COLORS.lime : COLORS.white,
        fontSize: 16
      });
    });
    groupSlide.addNotes(
      asciiText(
        items
          .map(
            (post) =>
              `Day ${post.dayNumber}: ${post.headline}\nCaption: ${post.caption}\nVisual: ${post.visualBrief}`
          )
          .join("\n\n")
      )
    );
  }

  return 11;
}

function buildEmailSlide(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number,
  emails: ReturnType<typeof parsePlan>["emails"]
) {
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Email Campaign",
    "Five-email conversion path",
    emails?.campaignName ?? "Email sequence pending."
  );

  if (!emails) {
    addMissing(slide, "Email campaign");
    return;
  }

  addCard(slide, {
    x: M,
    y: 2.05,
    w: 12.25,
    h: 3.9,
    title: "Sequence summary",
    body: emails.emails
      .map(
        (email) =>
          `Email ${email.sequenceNumber} / Day ${email.sendDay} / ${email.role}: ${email.subjectLine}`
      )
      .join("\n"),
    fill: COLORS.white,
    fontSize: 16
  });
  slide.addNotes(
    asciiText(
      emails.emails
        .map(
          (email) =>
            `Email ${email.sequenceNumber}: ${email.subjectLine}\nPreview: ${email.previewText}\nBody: ${email.body}`
        )
        .join("\n\n")
    )
  );
}

function buildLandingPageSlide(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number,
  landingPage: ReturnType<typeof parsePlan>["landingPage"]
) {
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Landing Page Copy",
    "Conversion page",
    landingPage?.pageName ?? "Landing page pending."
  );

  if (!landingPage) {
    addMissing(slide, "Landing page");
    return;
  }

  addCard(slide, {
    x: M,
    y: 2.05,
    w: 6.1,
    h: 1.45,
    title: "Hero",
    body: `${landingPage.hero.headline}\nCTA: ${landingPage.hero.primaryCallToAction}`,
    fill: COLORS.lime,
    fontSize: 17
  });
  addCard(slide, {
    x: 6.95,
    y: 2.05,
    w: 5.85,
    h: 1.45,
    title: "Problem",
    body: landingPage.problem.headline,
    fill: COLORS.white,
    fontSize: 18
  });
  addCard(slide, {
    x: M,
    y: 3.75,
    w: 3.9,
    h: 1.5,
    title: "Benefits",
    body: landingPage.benefits.items.map((item) => item.title).join("\n"),
    fill: COLORS.white,
    fontSize: 17
  });
  addCard(slide, {
    x: 4.72,
    y: 3.75,
    w: 3.9,
    h: 1.5,
    title: "Process",
    body: landingPage.process.steps.map((step) => step.title).join("\n"),
    fill: COLORS.white,
    fontSize: 17
  });
  addCard(slide, {
    x: 8.9,
    y: 3.75,
    w: 3.9,
    h: 1.5,
    title: "Offer",
    body: `${landingPage.offer.headline}\nCTA: ${landingPage.offer.callToAction}`,
    fill: COLORS.white,
    fontSize: 16
  });
  slide.addText(shortText(landingPage.finalCallToAction.headline, 120), {
    x: M,
    y: 5.78,
    w: 12,
    h: 0.32,
    fontSize: 20,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
  slide.addNotes(
    asciiText(
      `Hero: ${landingPage.hero.headline}\n${landingPage.hero.subheadline}\n\nProblem: ${landingPage.problem.body}\n\nOffer: ${landingPage.offer.body}\n\nFinal CTA: ${landingPage.finalCallToAction.body}`
    )
  );
}

function buildSalesPitchSlide(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number,
  salesPitch: ReturnType<typeof parsePlan>["salesPitch"]
) {
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Sales Pitch Toolkit",
    "Conversation system",
    salesPitch?.pitchName ?? "Sales pitch pending."
  );

  if (!salesPitch) {
    addMissing(slide, "Sales pitch");
    return;
  }

  addCard(slide, {
    x: M,
    y: 2.05,
    w: 5.95,
    h: 1.4,
    title: "Elevator pitch",
    body: salesPitch.elevatorPitch,
    fill: COLORS.lime,
    fontSize: 16
  });
  addCard(slide, {
    x: 6.85,
    y: 2.05,
    w: 5.95,
    h: 1.4,
    title: "Buying trigger",
    body: salesPitch.audienceSnapshot.buyingTrigger,
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: M,
    y: 3.72,
    w: 3.9,
    h: 1.8,
    title: "Discovery",
    body: salesPitch.conversationPitch.discoveryQuestions.slice(0, 3).join("\n"),
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: 4.72,
    y: 3.72,
    w: 3.9,
    h: 1.8,
    title: "Offer presentation",
    body: salesPitch.conversationPitch.offerPresentation,
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: 8.9,
    y: 3.72,
    w: 3.9,
    h: 1.8,
    title: "Closing",
    body: `${salesPitch.closing.directClose}\n${salesPitch.closing.lowPressureClose}`,
    fill: COLORS.white,
    fontSize: 16
  });
  slide.addNotes(
    asciiText(
      `Elevator pitch: ${salesPitch.elevatorPitch}\n\nObjections:\n${salesPitch.objections
        .map((item) => `${item.objection}: ${item.response}`)
        .join("\n")}\n\nFollow-up:\n${salesPitch.followUp.emailBody}`
    )
  );
}

function buildVideosSlide(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number
) {
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Ready Videos",
    "Release schedule",
    "Prepared videos and ideal local publish times."
  );

  if (input.videos.length === 0) {
    addMissing(slide, "Ready videos");
    return;
  }

  input.videos.slice(0, 6).forEach((video, index) => {
    addCard(slide, {
      x: M + (index % 3) * 4.15,
      y: 2.0 + Math.floor(index / 3) * 2.25,
      w: 3.85,
      h: 1.85,
      title: `${video.platform} / ${video.status}`,
      body: `${video.title}\nPublish: ${formatDateTime(
        video.publishAt,
        input.timezone
      )}\nCTA: ${video.callToAction}`,
      fill: index === 0 ? COLORS.lime : COLORS.white,
      fontSize: 16
    });
  });
  slide.addNotes(
    asciiText(
      input.videos
        .map(
          (video) =>
            `${video.title}: ${video.platform}, release ${formatDateTime(
              video.releaseAt,
              input.timezone
            )}, publish ${formatDateTime(video.publishAt, input.timezone)}`
        )
        .join("\n")
    )
  );
}

function buildExecutionReviewSlide(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number,
  kpis: ReturnType<typeof parsePlan>["kpis"]
) {
  const slide = addBaseSlide(
    pptx,
    input,
    slideNo,
    "Execution Review",
    "Performance layer",
    "Use this after campaign data is available."
  );

  if (!kpis) {
    addMissing(slide, "Execution review");
    return;
  }

  addCard(slide, {
    x: M,
    y: 2.05,
    w: 3.9,
    h: 1.35,
    title: "Score",
    body: `${kpis.review.score}/100\n${kpis.review.status}`,
    fill: COLORS.lime,
    fontSize: 22
  });
  addCard(slide, {
    x: 4.72,
    y: 2.05,
    w: 8.08,
    h: 1.35,
    title: "Executive summary",
    body: kpis.review.executiveSummary,
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: M,
    y: 3.72,
    w: 3.9,
    h: 1.72,
    title: "Wins",
    body: kpis.review.wins.join("\n"),
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: 4.72,
    y: 3.72,
    w: 3.9,
    h: 1.72,
    title: "Risks",
    body: kpis.review.risks.join("\n"),
    fill: COLORS.white,
    fontSize: 16
  });
  addCard(slide, {
    x: 8.9,
    y: 3.72,
    w: 3.9,
    h: 1.72,
    title: "Next actions",
    body: kpis.review.nextActions.join("\n"),
    fill: COLORS.white,
    fontSize: 16
  });
  slide.addNotes(asciiText(kpis.review.executiveSummary));
}

function buildFinalSlide(
  pptx: Presentation,
  input: MarketingPlanPptxInput,
  slideNo: number,
  strategy: ReturnType<typeof parsePlan>["strategy"]
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.dark };
  addEyebrow(slide, "Next best moves", true);
  slide.addText("Execute one focused month.", {
    x: M,
    y: 1.1,
    w: 10.8,
    h: 0.75,
    fontFace: "Aptos Display",
    fontSize: 50,
    bold: true,
    color: COLORS.white,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
  addBulletList(
    slide,
    strategy?.nextActions ?? [
      "Approve the campaign direction.",
      "Publish the first week of content.",
      "Track qualified leads, booked calls, and sales."
    ],
    M,
    2.35,
    9.8,
    2.2,
    24
  );
  slide.addText(`Primary CTA: ${shortText(input.company.primary_cta, 120)}`, {
    x: M,
    y: 5.05,
    w: 8.8,
    h: 0.42,
    fontSize: 24,
    bold: true,
    color: COLORS.lime,
    margin: 0,
    breakLine: false,
    fit: "shrink"
  });
  addFooter(slide, input, slideNo);
}

export async function renderMarketingPlanPptx(input: MarketingPlanPptxInput) {
  const parsed = parsePlan(input);
  const completeSections = [
    parsed.strategy,
    parsed.calendar,
    parsed.posts,
    parsed.emails,
    parsed.landingPage,
    parsed.salesPitch,
    input.videos.length > 0 ? input.videos : null
  ].filter(Boolean).length;

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Campaignova";
  pptx.company = "Campaignova";
  pptx.subject = `${formatMonth(input.plan.month)} marketing plan`;
  pptx.title = `${asciiText(input.company.name)} Marketing Plan`;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos"
  };

  buildCover(pptx, input, completeSections);
  let slideNo = 2;
  buildBusinessMemory(pptx, input, slideNo);
  slideNo += 1;
  slideNo += buildStrategySlides(pptx, input, slideNo, parsed.strategy);
  slideNo += buildCalendarSlides(pptx, input, slideNo, parsed.calendar);
  slideNo += buildPostSlides(pptx, input, slideNo, parsed.posts);
  buildEmailSlide(pptx, input, slideNo, parsed.emails);
  slideNo += 1;
  buildLandingPageSlide(pptx, input, slideNo, parsed.landingPage);
  slideNo += 1;
  buildSalesPitchSlide(pptx, input, slideNo, parsed.salesPitch);
  slideNo += 1;
  buildVideosSlide(pptx, input, slideNo);
  slideNo += 1;
  buildExecutionReviewSlide(pptx, input, slideNo, parsed.kpis);
  slideNo += 1;
  buildFinalSlide(pptx, input, slideNo, parsed.strategy);

  const result = await pptx.write({
    outputType: "nodebuffer",
    compression: true
  });

  if (Buffer.isBuffer(result)) {
    return result;
  }

  if (result instanceof ArrayBuffer) {
    return Buffer.from(result);
  }

  if (result instanceof Uint8Array) {
    return Buffer.from(result);
  }

  return Buffer.from(String(result));
}
