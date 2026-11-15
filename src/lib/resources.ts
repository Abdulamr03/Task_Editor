// Study resources for a learning level: videos, courses, docs… found on the web
// (src/lib/ai/resources.ts) and stored on the level (LearningStep.resources).
// Safe to use in the browser.

export type ResourceCost = "FREE" | "FREE_AUDIT" | "PAID";
export type ResourceKind = "video" | "course" | "article" | "docs" | "book" | "practice";

export type Resource = {
  title: string;
  url: string;
  // e.g. "YouTube", "Udemy", "Coursera", "freeCodeCamp", "MDN".
  provider: string;
  kind: ResourceKind;
  cost: ResourceCost;
  // For paid ones, when known, e.g. "≈ $15 on sale" or "$49/month".
  price: string | null;
  // Short: why it's good for this level, length, language…
  note: string | null;
};

export const COST_LABEL: Record<ResourceCost, string> = {
  FREE: "Free",
  FREE_AUDIT: "Free to audit",
  PAID: "Paid",
};

export const KIND_ICON: Record<ResourceKind, string> = {
  video: "▶",
  course: "🎓",
  article: "📄",
  docs: "📘",
  book: "📚",
  practice: "🧩",
};

const COSTS = new Set<ResourceCost>(["FREE", "FREE_AUDIT", "PAID"]);
const KINDS = new Set<ResourceKind>(["video", "course", "article", "docs", "book", "practice"]);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

// Accepts only well-formed http(s) links; returns the normalised URL or null.
export function safeUrl(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 2000) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// Reads stored JSON (or Claude's answer) into a clean list. Bad entries are dropped.
export function readResources(raw: unknown): Resource[] {
  if (!Array.isArray(raw)) return [];
  const out: Resource[] = [];
  for (const r of raw.slice(0, 10)) {
    const x = (r ?? {}) as Record<string, unknown>;
    const url = safeUrl(x.url);
    const title = text(x.title, 200);
    if (!url || !title) continue;
    const cost = COSTS.has(x.cost as ResourceCost) ? (x.cost as ResourceCost) : "PAID";
    out.push({
      title,
      url,
      provider: text(x.provider, 60) || hostOf(url),
      kind: KINDS.has(x.kind as ResourceKind) ? (x.kind as ResourceKind) : "article",
      cost,
      price: cost === "PAID" ? text(x.price, 60) || null : null,
      note: text(x.note, 200) || null,
    });
  }
  return sortVideosFirst(out);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Video courses and videos first (video on demand is the main way to learn here), then the rest.
const KIND_ORDER: Record<ResourceKind, number> = { course: 0, video: 1, practice: 2, docs: 3, article: 4, book: 5 };
export function sortVideosFirst(list: Resource[]): Resource[] {
  return list
    .map((r, i) => ({ r, i }))
    .sort((a, b) => KIND_ORDER[a.r.kind] - KIND_ORDER[b.r.kind] || a.i - b.i)
    .map((x) => x.r);
}
