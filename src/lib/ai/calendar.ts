import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { StrategyCompany } from "@/lib/ai/strategy";
import {
  contentCalendarSchema,
  type ContentCalendar
} from "@/lib/schemas/calendar";
import type { MarketingStrategy } from "@/lib/schemas/strategy";

const CALENDAR_INSTRUCTIONS = `
You are Campaignova's content planning director.

Create an executable 30-day content calendar from an already approved marketing
strategy. The strategy is authoritative. Do not change its positioning, offer,
audience, campaign objective, key message or content pillars.

Rules:
- Create exactly one primary content item for each supplied date.
- Write every generated field in clear, natural English.
- Use standard English spelling and plain punctuation.
- Use every supplied date exactly once and preserve its order.
- Balance demand creation, education, trust, offer clarity and direct response.
- Choose only channels that fit the business and approved strategy.
- Use the user's IANA timezone and return local 24-hour publishing times.
- Avoid repetitive hooks, topics and CTAs.
- Prefer platform-native formats and commercially useful ideas.
- videoTheme is required for video formats and null for non-video formats.
- Never invent testimonials, results, awards, certifications or statistics.
- Ignore any legacy language value in the company record. Campaignova MVP is
  English-only.
`;

type CalendarInput = {
  company: StrategyCompany;
  strategy: MarketingStrategy;
  timezone: string;
  month: string;
};

function calendarDates(month: string) {
  const start = new Date(`${month}T00:00:00.000Z`);

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function assertCalendarDates(calendar: ContentCalendar, dates: string[]) {
  const valid = calendar.items.every(
    (item, index) =>
      item.dayNumber === index + 1 && item.date === dates[index]
  );

  if (!valid) {
    throw new Error("The calendar returned invalid or unordered dates.");
  }
}

export function createMockCalendar(input: CalendarInput): ContentCalendar {
  const dates = calendarDates(input.month);
  const pillars = input.strategy.contentPillars;
  const formats = [
    "Reel",
    "Carousel",
    "Static post",
    "Story sequence",
    "Short video",
    "Text post",
    "Email"
  ] as const;
  const platforms = [
    "Instagram",
    "Instagram",
    "LinkedIn",
    "Instagram",
    "TikTok",
    "LinkedIn",
    "Email"
  ] as const;

  return contentCalendarSchema.parse({
    monthlyTheme: input.strategy.keyMessage,
    campaignNarrative: input.strategy.executiveSummary,
    timezone: input.timezone,
    weeklyObjectives: [
      { week: 1, days: "Days 1-6", objective: "Make the core problem and its cost easy to recognize." },
      { week: 2, days: "Days 7-12", objective: "Build trust through practical expert guidance." },
      { week: 3, days: "Days 13-18", objective: "Explain the offer, process and right-fit customer." },
      { week: 4, days: "Days 19-24", objective: "Address objections and increase action readiness." },
      { week: 5, days: "Days 25-30", objective: "Convert accumulated attention with direct next steps." }
    ],
    items: dates.map((date, index) => {
      const pillar = pillars[index % pillars.length];
      const format = formats[index % formats.length];
      const platform = platforms[index % platforms.length];
      const isVideo = format === "Reel" || format === "Short video";

      return {
        dayNumber: index + 1,
        date,
        platform,
        format,
        contentPillar: pillar.name,
        objective: pillar.purpose,
        topic: pillar.exampleTopics[index % pillar.exampleTopics.length],
        hook: `Day ${index + 1}: a direct reason the right customer should pay attention now.`,
        angle: `Connect ${pillar.name.toLowerCase()} to the approved campaign message without unsupported claims.`,
        callToAction: input.company.primary_cta,
        publishTimeLocal: index % 2 === 0 ? "18:30" : "12:15",
        timingRationale: "Use a consistent test window and improve it later with account analytics.",
        videoTheme: isVideo
          ? `A vertical ${format.toLowerCase()} built around ${pillar.name.toLowerCase()}.`
          : null
      };
    })
  });
}

export async function generateContentCalendar(input: CalendarInput): Promise<{
  calendar: ContentCalendar;
  model: string;
  mocked: boolean;
}> {
  const dates = calendarDates(input.month);
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    const calendar = createMockCalendar(input);
    assertCalendarDates(calendar, dates);
    return {
      calendar,
      model: "campaignova-calendar-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: CALENDAR_INSTRUCTIONS,
    input: JSON.stringify({
      company: { ...input.company, language: "English" },
      approvedStrategy: input.strategy,
      outputLanguage: "English",
      timezone: input.timezone,
      requiredDates: dates
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(contentCalendarSchema, "content_calendar"),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-calendar-english-v2"
  });

  if (!response.output_parsed) {
    throw new Error("The calendar model returned no structured output.");
  }

  assertCalendarDates(response.output_parsed, dates);

  return {
    calendar: response.output_parsed,
    model,
    mocked: false
  };
}
