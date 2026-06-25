import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { contentCalendarSchema } from "@/lib/schemas/calendar";
import { generatedEmailCampaignSchema } from "@/lib/schemas/emails";
import { kpiExecutionReviewSchema } from "@/lib/schemas/kpis";
import { landingPageSchema } from "@/lib/schemas/landing-page";
import { generatedPostsSchema } from "@/lib/schemas/posts";
import { salesPitchSchema } from "@/lib/schemas/sales-pitch";
import { marketingStrategySchema } from "@/lib/schemas/strategy";

type PdfDoc = PDFKit.PDFDocument;

export type MarketingPlanPdfCompany = {
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

export type MarketingPlanPdfPlan = {
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

export type MarketingPlanPdfVideoRelease = {
  title: string;
  durationSeconds: number | null;
  platform: string;
  caption: string;
  callToAction: string;
  releaseAt: string;
  publishAt: string;
  status: string;
};

export type MarketingPlanPdfInput = {
  company: MarketingPlanPdfCompany;
  plan: MarketingPlanPdfPlan;
  timezone: string;
  subscriptionPlan: string;
  videos: MarketingPlanPdfVideoRelease[];
  generatedAt: string;
};

const PAGE_MARGIN = 48;
const FOOTER_HEIGHT = 42;
const COLORS = {
  ink: "#121412",
  muted: "#626760",
  faint: "#efede6",
  line: "#ddd8ca",
  paper: "#f7f4ec",
  purple: "#695cff",
  lime: "#d9ff43",
  white: "#ffffff"
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

function joinList(values: unknown[] | null | undefined) {
  const cleanValues = (values ?? []).map(asciiText).filter(Boolean);
  return cleanValues.length > 0 ? cleanValues.join(", ") : "Not specified";
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
    year: "numeric",
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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || "UTC"
  }).format(date);
}

function parsePlan(input: MarketingPlanPdfInput) {
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

function contentWidth(doc: PdfDoc) {
  return doc.page.width - PAGE_MARGIN * 2;
}

function bottomLimit(doc: PdfDoc) {
  return doc.page.height - PAGE_MARGIN - FOOTER_HEIGHT;
}

function ensureSpace(doc: PdfDoc, neededHeight = 80) {
  if (doc.y + neededHeight > bottomLimit(doc)) {
    doc.addPage();
  }
}

function writeTitle(doc: PdfDoc, title: string, subtitle?: string) {
  ensureSpace(doc, 96);
  doc.moveDown(0.8);
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.ink)
    .text(asciiText(title), PAGE_MARGIN, doc.y, {
      width: contentWidth(doc)
    });

  if (subtitle) {
    doc
      .moveDown(0.25)
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(asciiText(subtitle), {
        width: contentWidth(doc)
      });
  }

  doc.moveDown(0.5);
  doc
    .moveTo(PAGE_MARGIN, doc.y)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
    .lineWidth(1)
    .strokeColor(COLORS.line)
    .stroke();
  doc.moveDown(0.7);
}

function writeSmallLabel(doc: PdfDoc, label: string) {
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(COLORS.purple)
    .text(asciiText(label).toUpperCase(), {
      width: contentWidth(doc),
      characterSpacing: 0.7
    });
}

function writeParagraph(doc: PdfDoc, text: string, options?: { indent?: number }) {
  const clean = asciiText(text);

  if (!clean) {
    return;
  }

  const indent = options?.indent ?? 0;
  const width = contentWidth(doc) - indent;
  const x = PAGE_MARGIN + indent;

  clean.split("\n\n").forEach((paragraph) => {
    ensureSpace(doc, 48);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text(paragraph, x, doc.y, {
        width,
        lineGap: 3
      });
    doc.moveDown(0.45);
  });
}

function writeField(doc: PdfDoc, label: string, value: string) {
  const clean = asciiText(value);

  if (!clean) {
    return;
  }

  ensureSpace(doc, 64);
  writeSmallLabel(doc, label);
  doc.moveDown(0.2);
  writeParagraph(doc, clean);
}

function writeBullets(doc: PdfDoc, values: string[]) {
  values.map(asciiText).filter(Boolean).forEach((value) => {
    ensureSpace(doc, 36);
    const startY = doc.y + 3;
    doc.circle(PAGE_MARGIN + 4, startY + 3, 2).fill(COLORS.purple);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(COLORS.ink)
      .text(value, PAGE_MARGIN + 16, doc.y, {
        width: contentWidth(doc) - 16,
        lineGap: 3
      });
    doc.moveDown(0.35);
  });
}

function writeNumberedItem(
  doc: PdfDoc,
  number: string,
  title: string,
  body: string
) {
  ensureSpace(doc, 92);
  doc
    .roundedRect(PAGE_MARGIN, doc.y, contentWidth(doc), 1, 0)
    .fill(COLORS.line);
  doc.moveDown(0.55);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.purple)
    .text(asciiText(number), PAGE_MARGIN, doc.y, {
      width: 44
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text(asciiText(title), PAGE_MARGIN + 48, doc.y, {
      width: contentWidth(doc) - 48
    });
  doc.moveDown(0.3);
  writeParagraph(doc, body, { indent: 48 });
}

function writeMissing(doc: PdfDoc, section: string) {
  ensureSpace(doc, 80);
  const y = doc.y;
  doc
    .roundedRect(PAGE_MARGIN, y, contentWidth(doc), 58, 12)
    .fillAndStroke(COLORS.faint, COLORS.line);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.ink)
    .text(`${asciiText(section)} is not generated yet.`, PAGE_MARGIN + 16, y + 14, {
      width: contentWidth(doc) - 32
    });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text("Generate this step in the dashboard, then export the plan again.", {
      width: contentWidth(doc) - 32
    });
  doc.y = y + 74;
}

function addCover(
  doc: PdfDoc,
  input: MarketingPlanPdfInput,
  completeSections: number
) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.ink);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.lime)
    .text("CAMPAIGNOVA MARKETING DIRECTOR", PAGE_MARGIN, 68, {
      characterSpacing: 1.4,
      width: contentWidth(doc)
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(34)
    .fillColor(COLORS.white)
    .text(asciiText(input.company.name), PAGE_MARGIN, 124, {
      width: contentWidth(doc),
      lineGap: 2
    });
  doc
    .font("Helvetica")
    .fontSize(16)
    .fillColor("#ffffffbb")
    .text(`${formatMonth(input.plan.month)} marketing plan`, {
      width: contentWidth(doc)
    });
  doc.moveDown(1.4);
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#ffffffcc")
    .text(asciiText(input.company.offer), {
      width: 420,
      lineGap: 4
    });

  const cardTop = 398;
  const cardWidth = (contentWidth(doc) - 24) / 3;
  const cards = [
    ["Plan", input.subscriptionPlan],
    ["Sections ready", `${completeSections}/7`],
    ["Videos assigned", `${input.videos.length}`]
  ];

  cards.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + index * (cardWidth + 12);
    doc
      .roundedRect(x, cardTop, cardWidth, 92, 16)
      .fill("#ffffff10")
      .strokeColor("#ffffff20")
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(COLORS.lime)
      .text(asciiText(label).toUpperCase(), x + 14, cardTop + 18, {
        width: cardWidth - 28
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(COLORS.white)
      .text(asciiText(value), x + 14, cardTop + 42, {
        width: cardWidth - 28
      });
  });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#ffffff99")
    .text(
      `Generated ${formatDateTime(input.generatedAt, input.timezone)} / ${asciiText(
        input.timezone
      )}`,
      PAGE_MARGIN,
      doc.page.height - 92,
      {
        width: contentWidth(doc)
      }
    );
  doc.addPage();
}

function addOverview(doc: PdfDoc, input: MarketingPlanPdfInput) {
  writeTitle(doc, "Business Memory", "The inputs used for this campaign plan.");
  writeField(doc, "Company", input.company.name);
  writeField(doc, "Industry", input.company.industry);
  writeField(doc, "Audience", input.company.audience);
  writeField(doc, "Location", input.company.location);
  writeField(doc, "Tone", input.company.tone);
  writeField(doc, "Primary goal", input.company.primary_goal);
  writeField(doc, "Primary call to action", input.company.primary_cta);
  writeField(doc, "Offer", input.company.offer);
  writeField(doc, "Price context", input.company.price_context ?? "Not specified");
  writeField(doc, "Monthly budget", moneyText(input.company.monthly_budget));
  writeField(doc, "Differentiator", input.company.differentiator ?? "Not specified");
  writeField(doc, "Active channels", joinList(input.company.active_channels));
  writeField(doc, "Competitors", joinList(input.company.competitors));
  writeField(doc, "Website", input.company.website_url ?? "Not specified");
}

function addStrategy(
  doc: PdfDoc,
  strategy: ReturnType<typeof parsePlan>["strategy"]
) {
  writeTitle(doc, "1. Marketing Strategy");

  if (!strategy) {
    writeMissing(doc, "Marketing strategy");
    return;
  }

  writeField(doc, "Executive summary", strategy.executiveSummary);
  writeField(doc, "Key message", strategy.keyMessage);
  writeField(doc, "Positioning", strategy.positioning);
  writeField(doc, "Ideal customer", strategy.idealCustomer);
  writeField(doc, "Core offer", strategy.coreOffer);
  writeField(doc, "Campaign objective", strategy.campaignObjective);

  writeTitle(doc, "Channel Priorities");
  strategy.channelPriorities.forEach((item, index) => {
    writeNumberedItem(
      doc,
      String(index + 1),
      `${item.channel} - ${item.cadence}`,
      `${item.role}\n\nRationale: ${item.rationale}`
    );
  });

  writeTitle(doc, "Content Pillars");
  strategy.contentPillars.forEach((pillar, index) => {
    writeNumberedItem(
      doc,
      String(index + 1),
      pillar.name,
      `${pillar.purpose}\n\nExample topics: ${pillar.exampleTopics.join("; ")}`
    );
  });

  writeTitle(doc, "KPIs, Next Actions and Risks");
  strategy.kpis.forEach((kpi) => {
    writeNumberedItem(doc, kpi.name, kpi.target, kpi.reason);
  });
  writeSmallLabel(doc, "Next actions");
  writeBullets(doc, strategy.nextActions);
  writeSmallLabel(doc, "Strategic risks");
  writeBullets(doc, strategy.strategicRisks);
}

function addCalendar(
  doc: PdfDoc,
  calendar: ReturnType<typeof parsePlan>["calendar"]
) {
  writeTitle(doc, "2. Content Calendar");

  if (!calendar) {
    writeMissing(doc, "Content calendar");
    return;
  }

  writeField(doc, "Monthly theme", calendar.monthlyTheme);
  writeField(doc, "Campaign narrative", calendar.campaignNarrative);
  writeField(doc, "Timezone", calendar.timezone);

  writeTitle(doc, "Weekly Objectives");
  calendar.weeklyObjectives.forEach((week) => {
    writeNumberedItem(
      doc,
      `Week ${week.week}`,
      week.days,
      week.objective
    );
  });

  writeTitle(doc, "30-Day Publishing Plan");
  calendar.items.forEach((item) => {
    writeNumberedItem(
      doc,
      `Day ${item.dayNumber}`,
      `${formatDate(item.date)} - ${item.platform} - ${item.publishTimeLocal}`,
      [
        `Format: ${item.format}`,
        `Pillar: ${item.contentPillar}`,
        `Topic: ${item.topic}`,
        `Hook: ${item.hook}`,
        `Angle: ${item.angle}`,
        `CTA: ${item.callToAction}`,
        `Timing: ${item.timingRationale}`,
        item.videoTheme ? `Video theme: ${item.videoTheme}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    );
  });
}

function addPosts(doc: PdfDoc, posts: ReturnType<typeof parsePlan>["posts"]) {
  writeTitle(doc, "3. Social Posts");

  if (!posts) {
    writeMissing(doc, "Social posts");
    return;
  }

  posts.posts.forEach((post) => {
    writeNumberedItem(
      doc,
      `Day ${post.dayNumber}`,
      `${post.headline} - ${post.platform} - ${post.format}`,
      [
        `Date: ${formatDate(post.date)}`,
        `Pillar: ${post.contentPillar}`,
        `Body: ${post.body}`,
        `Caption: ${post.caption}`,
        `CTA: ${post.callToAction}`,
        `Hashtags: ${post.hashtags.join(" ")}`,
        `Visual brief: ${post.visualBrief}`,
        post.videoScript
          ? `Video hook: ${post.videoScript.hook}\nSpoken script: ${post.videoScript.spokenScript}\nOn-screen text: ${post.videoScript.onScreenText.join(" / ")}\nShot list: ${post.videoScript.shotList.join(" / ")}`
          : ""
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  });
}

function addEmails(
  doc: PdfDoc,
  emails: ReturnType<typeof parsePlan>["emails"]
) {
  writeTitle(doc, "4. Email Campaign");

  if (!emails) {
    writeMissing(doc, "Email campaign");
    return;
  }

  writeField(doc, "Campaign name", emails.campaignName);
  emails.emails.forEach((email) => {
    writeNumberedItem(
      doc,
      `Email ${email.sequenceNumber}`,
      `${email.internalName} - Send day ${email.sendDay}`,
      [
        `Role: ${email.role}`,
        `Subject: ${email.subjectLine}`,
        `Alt subject: ${email.alternateSubjectLine}`,
        `Preview: ${email.previewText}`,
        `Body: ${email.body}`,
        `CTA: ${email.callToAction}`,
        email.postscript ? `P.S. ${email.postscript}` : ""
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  });
}

function addLandingPage(
  doc: PdfDoc,
  landingPage: ReturnType<typeof parsePlan>["landingPage"]
) {
  writeTitle(doc, "5. Landing Page Copy");

  if (!landingPage) {
    writeMissing(doc, "Landing page");
    return;
  }

  writeField(doc, "Page name", landingPage.pageName);
  writeField(
    doc,
    "SEO",
    `Title: ${landingPage.seo.title}\nDescription: ${landingPage.seo.description}`
  );
  writeField(
    doc,
    "Hero",
    [
      landingPage.hero.eyebrow,
      landingPage.hero.headline,
      landingPage.hero.subheadline,
      `Primary CTA: ${landingPage.hero.primaryCallToAction}`,
      landingPage.hero.secondaryCallToAction
        ? `Secondary CTA: ${landingPage.hero.secondaryCallToAction}`
        : ""
    ]
      .filter(Boolean)
      .join("\n\n")
  );
  writeField(
    doc,
    "Problem",
    `${landingPage.problem.headline}\n\n${landingPage.problem.body}\n\nPain points:\n${landingPage.problem.painPoints.join("\n")}`
  );
  writeField(
    doc,
    "Solution",
    `${landingPage.solution.headline}\n\n${landingPage.solution.body}`
  );
  writeField(
    doc,
    "Benefits",
    `${landingPage.benefits.headline}\n\n${landingPage.benefits.introduction}`
  );
  landingPage.benefits.items.forEach((item, index) => {
    writeNumberedItem(doc, String(index + 1), item.title, item.description);
  });
  writeField(
    doc,
    "Process",
    `${landingPage.process.headline}\n\n${landingPage.process.introduction}`
  );
  landingPage.process.steps.forEach((step, index) => {
    writeNumberedItem(doc, String(index + 1), step.title, step.description);
  });
  writeField(
    doc,
    "Offer",
    `${landingPage.offer.headline}\n\n${landingPage.offer.body}\n\nInclusions:\n${landingPage.offer.inclusions.join("\n")}\n\nCTA: ${landingPage.offer.callToAction}`
  );
  writeField(
    doc,
    "Trust",
    `${landingPage.trust.headline}\n\n${landingPage.trust.body}`
  );
  landingPage.trust.reasons.forEach((reason, index) => {
    writeNumberedItem(doc, String(index + 1), reason.title, reason.description);
  });
  writeField(doc, "FAQ", landingPage.faq.headline);
  landingPage.faq.items.forEach((item, index) => {
    writeNumberedItem(doc, String(index + 1), item.question, item.answer);
  });
  writeField(
    doc,
    "Final call to action",
    `${landingPage.finalCallToAction.headline}\n\n${landingPage.finalCallToAction.body}\n\nCTA: ${landingPage.finalCallToAction.callToAction}`
  );
}

function addSalesPitch(
  doc: PdfDoc,
  salesPitch: ReturnType<typeof parsePlan>["salesPitch"]
) {
  writeTitle(doc, "6. Sales Pitch");

  if (!salesPitch) {
    writeMissing(doc, "Sales pitch");
    return;
  }

  writeField(doc, "Pitch name", salesPitch.pitchName);
  writeField(
    doc,
    "Audience snapshot",
    `Problem: ${salesPitch.audienceSnapshot.problem}\n\nDesired outcome: ${salesPitch.audienceSnapshot.desiredOutcome}\n\nBuying trigger: ${salesPitch.audienceSnapshot.buyingTrigger}`
  );
  writeField(doc, "Elevator pitch", salesPitch.elevatorPitch);
  writeField(
    doc,
    "Conversation pitch",
    [
      `Opener: ${salesPitch.conversationPitch.opener}`,
      `Discovery questions:\n${salesPitch.conversationPitch.discoveryQuestions.join("\n")}`,
      `Transition: ${salesPitch.conversationPitch.transition}`,
      `Offer presentation: ${salesPitch.conversationPitch.offerPresentation}`,
      `Differentiator: ${salesPitch.conversationPitch.differentiator}`,
      `CTA: ${salesPitch.conversationPitch.callToAction}`
    ].join("\n\n")
  );
  writeTitle(doc, "Objection Handling");
  salesPitch.objections.forEach((item, index) => {
    writeNumberedItem(
      doc,
      String(index + 1),
      item.objection,
      `${item.response}\n\nBridge question: ${item.bridgeQuestion}`
    );
  });
  writeField(
    doc,
    "Closing",
    `${salesPitch.closing.summary}\n\nDirect close: ${salesPitch.closing.directClose}\n\nLow-pressure close: ${salesPitch.closing.lowPressureClose}`
  );
  writeField(
    doc,
    "Follow-up",
    `Subject: ${salesPitch.followUp.emailSubject}\n\nEmail: ${salesPitch.followUp.emailBody}\n\nDirect message: ${salesPitch.followUp.directMessage}`
  );
}

function addVideos(doc: PdfDoc, input: MarketingPlanPdfInput) {
  writeTitle(doc, "7. Ready Videos");

  if (input.videos.length === 0) {
    writeMissing(doc, "Ready videos");
    return;
  }

  input.videos.forEach((video, index) => {
    writeNumberedItem(
      doc,
      String(index + 1),
      `${video.title} - ${video.platform}`,
      [
        `Status: ${video.status}`,
        video.durationSeconds ? `Duration: ${video.durationSeconds}s` : "",
        `Release: ${formatDateTime(video.releaseAt, input.timezone)}`,
        `Ideal publish time: ${formatDateTime(video.publishAt, input.timezone)}`,
        `Caption: ${video.caption}`,
        `CTA: ${video.callToAction}`
      ]
        .filter(Boolean)
        .join("\n\n")
    );
  });
}

function addKpiReview(
  doc: PdfDoc,
  kpis: ReturnType<typeof parsePlan>["kpis"]
) {
  writeTitle(doc, "Execution Review", "Optional review after campaign results.");

  if (!kpis) {
    writeMissing(doc, "Execution review");
    return;
  }

  writeField(
    doc,
    "Result",
    `${kpis.review.score}/100 - ${kpis.review.status}\n\n${kpis.review.executiveSummary}`
  );
  writeField(
    doc,
    "Computed metrics",
    [
      `CTR: ${kpis.computed.clickThroughRate ?? "n/a"}%`,
      `Landing page conversion: ${kpis.computed.landingPageConversionRate ?? "n/a"}%`,
      `Lead qualification: ${kpis.computed.leadQualificationRate ?? "n/a"}%`,
      `Lead to call: ${kpis.computed.leadToCallRate ?? "n/a"}%`,
      `Call to sale: ${kpis.computed.callToSaleRate ?? "n/a"}%`,
      `Cost per lead: ${kpis.computed.costPerLead ?? "n/a"}`,
      `CAC: ${kpis.computed.customerAcquisitionCost ?? "n/a"}`,
      `ROAS: ${kpis.computed.returnOnAdSpend ?? "n/a"}`,
      `Execution rate: ${kpis.computed.contentExecutionRate ?? "n/a"}%`,
      `Target attainment: ${kpis.computed.targetAttainmentRate ?? "n/a"}%`
    ].join("\n")
  );
  writeField(doc, "Wins", kpis.review.wins.join("\n"));
  writeField(doc, "Risks", kpis.review.risks.join("\n"));
  writeField(doc, "Next actions", kpis.review.nextActions.join("\n"));
  writeField(
    doc,
    "Stop / Start / Continue",
    `Stop: ${kpis.review.stop}\n\nStart: ${kpis.review.start}\n\nContinue: ${kpis.review.continue}`
  );
  writeField(doc, "Budget recommendation", kpis.review.budgetRecommendation);
}

function addFooters(doc: PdfDoc, input: MarketingPlanPdfInput) {
  const range = doc.bufferedPageRange();

  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(index === range.start ? "#ffffff99" : COLORS.muted)
      .text(
        `Campaignova / ${asciiText(input.company.name)} / Page ${
          index - range.start + 1
        } of ${range.count}`,
        PAGE_MARGIN,
        doc.page.height - 58,
        {
          align: "center",
          lineBreak: false,
          width: contentWidth(doc)
        }
      );
  }
}

export async function renderMarketingPlanPdf(input: MarketingPlanPdfInput) {
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

  const doc = new PDFDocument({
    size: "LETTER",
    margin: PAGE_MARGIN,
    bufferPages: true,
    info: {
      Title: `${asciiText(input.company.name)} Marketing Plan`,
      Author: "Campaignova",
      Subject: `${formatMonth(input.plan.month)} marketing plan`,
      Keywords: "marketing, campaign, content, sales"
    }
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  addCover(doc, input, completeSections);
  addOverview(doc, input);
  addStrategy(doc, parsed.strategy);
  addCalendar(doc, parsed.calendar);
  addPosts(doc, parsed.posts);
  addEmails(doc, parsed.emails);
  addLandingPage(doc, parsed.landingPage);
  addSalesPitch(doc, parsed.salesPitch);
  addVideos(doc, input);
  addKpiReview(doc, parsed.kpis);
  addFooters(doc, input);
  doc.end();

  return done;
}
