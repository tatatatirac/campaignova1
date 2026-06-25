import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { StrategyCompany } from "@/lib/ai/strategy";
import type { ContentCalendar } from "@/lib/schemas/calendar";
import {
  generatedPostDraftSchema,
  generatedPostSchema,
  generatedPostsSchema,
  postBatchSchema,
  type GeneratedPost,
  type GeneratedPosts
} from "@/lib/schemas/posts";
import type { MarketingStrategy } from "@/lib/schemas/strategy";

const POSTS_INSTRUCTIONS = `
You are Campaignova's senior copy and social content director.

Write final, publishable content for the supplied approved calendar items.
The approved strategy and calendar are authoritative. Do not change their
positioning, audience, offer, objective, platform, format, topic or CTA.

Rules:
- Return exactly one post for every supplied calendar item.
- Write every generated field in clear, natural English.
- Use standard English spelling and plain punctuation.
- Return the supplied dayNumber exactly. Approved date, platform, format and
  contentPillar are attached by the backend and cannot be changed.
- Make each post materially different in hook, argument and wording.
- Write for the specific platform and format.
- headline is the content title or first-frame headline.
- body is the full core content, including carousel slide copy where relevant.
- caption is the final platform caption, not an outline.
- hashtags must be focused and non-spammy; an empty array is allowed.
- visualBrief must be practical enough for a designer or template system.
- videoScript is required only for Reel or Short video formats; otherwise null.
- Never invent testimonials, statistics, awards, certifications or medical,
  legal or financial claims.
- Do not guarantee business or health outcomes.
- Ignore any legacy language value in the company record. Campaignova MVP is
  English-only.
`;

type PostsInput = {
  company: StrategyCompany;
  strategy: MarketingStrategy;
  calendar: ContentCalendar;
  version: number;
};

function createMockPost(
  input: PostsInput,
  calendarItem: ContentCalendar["items"][number]
): GeneratedPost {
  const isVideo =
    calendarItem.format === "Reel" ||
    calendarItem.format === "Short video";
  const headline = calendarItem.hook.replace(/[.!?]+$/, "");
  const body = `${calendarItem.hook}\n\n${calendarItem.angle}\n\n${calendarItem.objective}`;

  return {
    dayNumber: calendarItem.dayNumber,
    date: calendarItem.date,
    platform: calendarItem.platform,
    format: calendarItem.format,
    contentPillar: calendarItem.contentPillar,
    headline,
    body,
    caption: `${body}\n\n${calendarItem.callToAction}`,
    callToAction: calendarItem.callToAction,
    hashtags: ["#Marketing", "#BusinessGrowth"],
    visualBrief: `Create a clean ${calendarItem.format.toLowerCase()} for ${input.company.name} using the topic "${calendarItem.topic}" and a ${input.company.tone.toLowerCase()} visual tone.`,
    videoScript: isVideo
      ? {
          hook: calendarItem.hook,
          spokenScript: `${calendarItem.hook} ${calendarItem.angle} ${calendarItem.callToAction}.`,
          onScreenText: [
            calendarItem.hook,
            calendarItem.topic,
            calendarItem.callToAction
          ],
          shotList: [
            "Open with a direct-to-camera hook.",
            "Show a simple supporting visual or process detail.",
            "Finish with the call to action on screen."
          ]
        }
      : null
  };
}

function mergePostBatch(
  posts: Array<{ dayNumber: number } & Record<string, unknown>>,
  calendarItems: ContentCalendar["items"]
): GeneratedPost[] {
  const valid =
    posts.length === calendarItems.length &&
    posts.every((post, index) => {
    const calendarItem = calendarItems[index];
      return post.dayNumber === calendarItem.dayNumber;
    });

  if (!valid) {
    throw new Error("Generated posts no longer match the approved calendar.");
  }

  return posts.map((post, index) => {
    const calendarItem = calendarItems[index];

    return generatedPostSchema.parse({
      ...post,
      date: calendarItem.date,
      platform: calendarItem.platform,
      format: calendarItem.format,
      contentPillar: calendarItem.contentPillar
    });
  });
}

function normalizeHeadline(headline: string) {
  return headline
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function ensureUniquePosts(
  posts: GeneratedPost[],
  calendarItems: ContentCalendar["items"]
) {
  const seen = new Set<string>();

  return posts.map((post, index) => {
    let headline = post.headline;
    let normalized = normalizeHeadline(headline);

    if (seen.has(normalized)) {
      const topicSuffix = calendarItems[index].topic.replace(/[.!?]+$/, "");
      headline = topicSuffix.slice(0, 180);
      normalized = normalizeHeadline(headline);
    }

    if (seen.has(normalized)) {
      headline = `${headline.slice(0, 165)} - Day ${post.dayNumber}`;
      normalized = normalizeHeadline(headline);
    }

    seen.add(normalized);
    return generatedPostSchema.parse({ ...post, headline });
  });
}

function assertUniquePosts(posts: GeneratedPost[]) {
  const normalizedHeadlines = posts.map((post) =>
    normalizeHeadline(post.headline)
  );

  if (new Set(normalizedHeadlines).size !== posts.length) {
    throw new Error("Generated posts contain duplicate headlines.");
  }
}

export async function generatePosts(input: PostsInput): Promise<{
  result: GeneratedPosts;
  model: string;
  mocked: boolean;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    const posts = input.calendar.items.map((item) =>
      createMockPost(input, item)
    );
    return {
      result: generatedPostsSchema.parse({
        version: input.version,
        posts
      }),
      model: "campaignova-posts-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const batches = [
    input.calendar.items.slice(0, 10),
    input.calendar.items.slice(10, 20),
    input.calendar.items.slice(20, 30)
  ];
  const posts: GeneratedPost[] = [];

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const response = await client.responses.parse({
      model,
      instructions: POSTS_INSTRUCTIONS,
      input: JSON.stringify({
        company: { ...input.company, language: "English" },
        approvedStrategy: input.strategy,
        calendarItems: batch,
        outputLanguage: "English",
        batchNumber: index + 1,
        totalBatches: batches.length
      }),
      reasoning: { effort: "medium" },
      text: {
        format: zodTextFormat(postBatchSchema, `post_batch_${index + 1}`),
        verbosity: "low"
      },
      store: false,
      prompt_cache_key: "campaignova-posts-english-v2"
    });

    if (!response.output_parsed) {
      throw new Error(`Post batch ${index + 1} returned no structured output.`);
    }

    posts.push(...mergePostBatch(response.output_parsed.posts, batch));
  }

  const uniquePosts = ensureUniquePosts(posts, input.calendar.items);
  assertUniquePosts(uniquePosts);

  return {
    result: generatedPostsSchema.parse({
      version: input.version,
      posts: uniquePosts
    }),
    model,
    mocked: false
  };
}

export async function regeneratePost(
  input: Omit<PostsInput, "version">,
  dayNumber: number
): Promise<{ post: GeneratedPost; model: string; mocked: boolean }> {
  const calendarItem = input.calendar.items.find(
    (item) => item.dayNumber === dayNumber
  );

  if (!calendarItem) {
    throw new Error("The selected calendar item does not exist.");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const mockMode = process.env.OPENAI_MOCK === "true" || !apiKey;

  if (mockMode) {
    return {
      post: createMockPost({ ...input, version: 1 }, calendarItem),
      model: "campaignova-posts-mock-v1",
      mocked: true
    };
  }

  const model = process.env.OPENAI_CONTENT_MODEL || "gpt-5.4-mini";
  const client = new OpenAI({ apiKey });
  const response = await client.responses.parse({
    model,
    instructions: `${POSTS_INSTRUCTIONS}

Regenerate this single item with a substantially different hook, structure and
wording while preserving all approved calendar fields exactly.`,
    input: JSON.stringify({
      company: { ...input.company, language: "English" },
      approvedStrategy: input.strategy,
      calendarItem,
      outputLanguage: "English"
    }),
    reasoning: { effort: "medium" },
    text: {
      format: zodTextFormat(generatedPostDraftSchema, "regenerated_post"),
      verbosity: "low"
    },
    store: false,
    prompt_cache_key: "campaignova-post-regenerate-english-v2"
  });

  if (!response.output_parsed) {
    throw new Error("Post regeneration returned no structured output.");
  }

  const [post] = mergePostBatch([response.output_parsed], [calendarItem]);

  return {
    post,
    model,
    mocked: false
  };
}
