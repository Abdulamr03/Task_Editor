import Anthropic from "@anthropic-ai/sdk";
import { readResources, sortVideosFirst, type Resource } from "@/lib/resources";
import { AiError, explainApiError, hasApiKey, MODEL } from "./client";

// Finds study resources for learning levels with Claude and web search, so
// every link is a real page that came up in a search (never one made up).

export type LevelToSearch = {
  id: string;
  title: string;
  milestone: string | null;
  path: string;
  pathDescription: string | null;
  difficulty: string | null;
  // A link the person already added to the level, if any.
  existingLink: string | null;
};

// At most this many levels per search (each needs a few searches).
export const LEVELS_PER_SEARCH = 6;

const SYSTEM = `You find study resources for levels of a person's learning paths. Use web search to find real, current pages, then give your answer with the give_resources tool.

The person learns mainly from video on demand: video courses and video lessons they can watch at their own pace. Make those the heart of every answer.

For each level:
- Give 3–4 resources that teach exactly that level (not just the general subject). Prefer well-known, well-rated, up-to-date ones.
- At least 2 must be video courses or video lessons (kind "course" or "video"):
  - a free one: a full course or playlist on YouTube (e.g. freeCodeCamp, Programming with Mosh, Traversy Media, CS50 and other well-known channels), a free Coursera / edX course to audit, Khan Academy, MIT OpenCourseWare videos;
  - a structured course on a video platform: Udemy, Coursera, edX, Pluralsight, LinkedIn Learning, Scrimba, Frontend Masters, Zero To Mastery, DataCamp…
- For practice levels (e.g. "practice Python"), pick project-based or exercise-based video courses (build-along projects, coding challenges solved on video). You may add one practice site (Exercism, Codewars, LeetCode…) as an extra.
- Handbooks, official docs and articles: at most one per level, and only as an extra after the video courses — never instead of them.
- Link to the specific page: the video, playlist or course page itself, never a search-results page or a channel's home page. Only use links that appeared in your search results.
- List video courses and videos first.
- cost: FREE when it costs nothing; FREE_AUDIT when the content is free but a certificate or graded work costs money (typical for Coursera and edX courses); PAID when you must pay to learn from it (typical for Udemy, Pluralsight, Frontend Masters, unless the course is marked free). For PAID, give a short price hint in price when the search shows one (e.g. "≈ $15 on sale", "$29/month"), else null.
- kind: course (a structured video course), video (a single video or a playlist), practice, docs, article or book.
- note: the length and why it fits, e.g. "12-hour course, beginner friendly" or "8 videos, build 3 projects", or null.
- Several levels of the same path may share one course; reuse it where it fits.
Be efficient with searches: one or two per level is usually enough. Write in English unless the level titles are in another language.`;

const RESOURCE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "url", "provider", "kind", "cost", "price", "note"],
  properties: {
    title: { type: "string" },
    url: { type: "string" },
    provider: { type: "string", description: "e.g. YouTube, Udemy, Coursera, MDN" },
    kind: { type: "string", enum: ["video", "course", "article", "docs", "book", "practice"] },
    cost: { type: "string", enum: ["FREE", "FREE_AUDIT", "PAID"] },
    price: { anyOf: [{ type: "string" }, { type: "null" }] },
    note: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
} as const;

const GIVE_TOOL: Anthropic.Beta.BetaTool = {
  name: "give_resources",
  description: "Give the resources you found, for every level asked about. Call it once, at the end.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["levels"],
    properties: {
      levels: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["levelId", "resources"],
          properties: {
            levelId: { type: "string" },
            resources: { type: "array", items: RESOURCE_SCHEMA },
          },
        },
      },
    },
  },
};

export async function findResources(levels: LevelToSearch[]): Promise<Map<string, Resource[]>> {
  if (!hasApiKey()) throw new AiError("No Anthropic API key is set. Add ANTHROPIC_API_KEY to your .env file and restart the app.");
  const batch = levels.slice(0, LEVELS_PER_SEARCH);
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content:
        `Find study resources for these levels (JSON):\n${JSON.stringify(batch)}\n\n` +
        "Search the web, then call give_resources with an entry for every levelId.",
    },
  ];

  let message: Anthropic.Beta.BetaMessage | null = null;
  const seen = new Set<string>();
  // Web search runs on Anthropic's side; a long search can pause and is resumed here.
  for (let round = 0; round < 4; round++) {
    try {
      message = await client.beta.messages
        .stream({
          model: MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system: SYSTEM,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: Math.min(3 + batch.length * 2, 15) }, GIVE_TOOL],
          tool_choice: { type: "auto" },
          messages,
        })
        .finalMessage();
    } catch (error) {
      throw new AiError(explainApiError(error, "finding study resources"));
    }
    collectUrls(message.content, seen);
    if (message.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: message.content as Anthropic.Beta.BetaContentBlockParam[] });
  }
  if (!message) throw new AiError("Claude didn't answer. Please try again.");
  if (message.stop_reason === "refusal") throw new AiError("Claude declined finding study resources.");
  if (message.stop_reason === "max_tokens") throw new AiError("Claude's answer was too long. Try fewer levels at once.");

  const call = message.content.find((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "give_resources");
  if (!call) throw new AiError("Claude didn't come back with resources. Please try again.");

  const ids = new Set(batch.map((l) => l.id));
  const found = new Map<string, Resource[]>(batch.map((l) => [l.id, []]));
  const answer = (call.input ?? {}) as { levels?: unknown };
  for (const entry of Array.isArray(answer.levels) ? answer.levels : []) {
    const e = (entry ?? {}) as { levelId?: unknown; resources?: unknown };
    if (typeof e.levelId !== "string" || !ids.has(e.levelId)) continue;
    // Keep only links that really came up in the searches.
    const list = readResources(e.resources).filter((r) => seen.has(urlKey(r.url)));
    found.set(e.levelId, sortVideosFirst(dedupe([...(found.get(e.levelId) ?? []), ...list])).slice(0, 5));
  }
  return found;
}

// Every URL that appeared in a search (or fetch) result this turn.
function collectUrls(blocks: Anthropic.Beta.BetaContentBlock[], seen: Set<string>) {
  for (const block of blocks) {
    if (!block.type.endsWith("_tool_result")) continue;
    const json = JSON.stringify(block);
    for (const m of json.matchAll(/https?:\/\/[^\s"'<>\\)\]]+/g)) seen.add(urlKey(m[0]));
  }
}

// Compares links loosely: no "www.", no trailing slash, no tracking bits.
// YouTube keeps the video / playlist id.
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    let host = u.hostname.replace(/^www\.|^m\./, "").toLowerCase();
    let path = u.pathname.replace(/\/+$/, "");
    // youtu.be/ID is the same video as youtube.com/watch?v=ID.
    if (host === "youtu.be") {
      u.searchParams.set("v", path.slice(1));
      host = "youtube.com";
      path = "/watch";
    }
    let extra = "";
    if (host === "youtube.com") extra = ["v", "list"].map((k) => (u.searchParams.get(k) ? `${k}=${u.searchParams.get(k)}` : "")).join("&");
    return `${host}${path}?${extra}`;
  } catch {
    return url;
  }
}

function dedupe(list: Resource[]): Resource[] {
  const keys = new Set<string>();
  return list.filter((r) => {
    const k = urlKey(r.url);
    if (keys.has(k)) return false;
    keys.add(k);
    return true;
  });
}
