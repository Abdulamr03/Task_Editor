import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AiError, hasApiKey } from "@/lib/ai/client";
import { findResources, LEVELS_PER_SEARCH } from "@/lib/ai/resources";
import { readResources, type Resource } from "@/lib/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /learning/resources  { stepIds: string[], refresh?: boolean }
// Returns the study resources of these levels. Levels never searched before
// (or all of them, with refresh) are searched on the web first, a few at a
// time, and the results are saved on the levels.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { stepIds?: unknown; refresh?: unknown };
  const ids = Array.isArray(body.stepIds) ? [...new Set(body.stepIds.filter((x): x is string => typeof x === "string"))].slice(0, 100) : [];
  if (ids.length === 0) return NextResponse.json({ error: "No levels given." }, { status: 400 });

  const steps = await db.learningStep.findMany({
    where: { id: { in: ids } },
    include: { milestone: { select: { title: true } }, learningPath: { select: { id: true, title: true, description: true } } },
    orderBy: [{ learningPathId: "asc" }, { order: "asc" }],
  });

  const resources: Record<string, Resource[]> = Object.fromEntries(steps.map((s) => [s.id, readResources(s.resources)]));
  const searchedBefore = new Set(steps.filter((s) => s.resourcesFoundAt).map((s) => s.id));
  const wanted = steps.filter((s) => body.refresh === true || !s.resourcesFoundAt);
  const toSearch = user.role === "ADMIN" && hasApiKey() ? wanted.slice(0, LEVELS_PER_SEARCH) : [];
  const reply = (extra: Record<string, unknown> = {}) =>
    NextResponse.json({
      resources,
      searched: steps.filter((s) => searchedBefore.has(s.id)).map((s) => s.id),
      // Levels still waiting for a search (ask again to continue).
      remaining: wanted.length - toSearch.length,
      ...extra,
    });

  if (wanted.length > 0 && user.role !== "ADMIN") return reply({ note: "Only admins can search for resources." });
  if (wanted.length > 0 && !hasApiKey()) {
    return reply({ error: "Finding resources uses Claude. Add ANTHROPIC_API_KEY to your .env file and restart the app." });
  }
  if (toSearch.length === 0) return reply();

  try {
    const found = await findResources(
      toSearch.map((s) => ({
        id: s.id,
        title: s.title,
        milestone: s.milestone?.title ?? null,
        path: s.learningPath.title,
        pathDescription: s.learningPath.description?.slice(0, 300) ?? null,
        difficulty: s.difficulty,
        existingLink: s.resourceUrl,
      })),
    );
    const now = new Date();
    await db.$transaction(
      toSearch.map((s) =>
        db.learningStep.update({
          where: { id: s.id },
          data: { resources: found.get(s.id) ?? [], resourcesFoundAt: now },
        }),
      ),
    );
    for (const s of toSearch) {
      resources[s.id] = found.get(s.id) ?? [];
      searchedBefore.add(s.id);
    }
    for (const pathId of new Set(toSearch.map((s) => s.learningPath.id))) revalidatePath(`/learning/${pathId}`);
    return reply();
  } catch (error) {
    if (error instanceof AiError) return reply({ error: error.message });
    console.error("Finding resources failed", error);
    return reply({ error: "Something went wrong while finding resources. Please try again." });
  }
}
