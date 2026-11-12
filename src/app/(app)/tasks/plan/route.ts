import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseDateInput, today } from "@/lib/dates";
import { AiError } from "@/lib/ai/client";
import { gatherCandidates, planDay } from "@/lib/ai/day-plan";
import { dayFrame, nowRounded } from "@/lib/planner/day";
import { getPlannerSettings } from "@/lib/planner/settings";
import { toHHMM } from "@/lib/planner/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /tasks/plan  { date: "YYYY-MM-DD", note }
// Asks Claude for a plan and returns it with the day's fixed blocks. Nothing is saved.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only admins can plan days." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { date?: string; note?: string; fromNow?: boolean };
  const day = parseDateInput(body.date ?? null);
  if (!day || day === "invalid") return NextResponse.json({ error: "Choose a valid day." }, { status: 400 });
  if (day < today()) return NextResponse.json({ error: "You can only plan today or a later day." }, { status: 400 });
  const note = String(body.note ?? "").trim().slice(0, 500);

  // Today: plan from the time the button was pressed (unless "whole day" was chosen).
  const settings = await getPlannerSettings();
  const isToday = day.getTime() === today().getTime();
  const fromNow = isToday && body.fromNow !== false;
  const now = nowRounded(settings);
  if (fromNow && now >= settings.dayEnd - 15) {
    return NextResponse.json(
      { error: `Your working day ended at ${toHHMM(settings.dayEnd)}. Plan tomorrow instead, or untick “Start from now” to plan the whole day.` },
      { status: 400 },
    );
  }
  const frame = await dayFrame(day, fromNow ? Math.max(now, settings.dayStart) : null);
  if (frame.capacity < 15) return NextResponse.json({ error: "There's no free time left in your working hours. Check Settings → Day planner." }, { status: 400 });

  const candidates = await gatherCandidates(day);
  try {
    const plan = await planDay({
      day,
      candidates,
      capacityMinutes: frame.capacity,
      dayStart: toHHMM(frame.shape.dayStart),
      dayEnd: toHHMM(frame.shape.dayEnd),
      fixedSummary: frame.fixedSummary,
      startsNow: fromNow && frame.shape.dayStart > settings.dayStart,
      note,
    });
    // Colours of the linked projects / learning paths, for the timeline.
    const [taskLinks, projects, paths] = await Promise.all([
      db.task.findMany({
        where: { id: { in: plan.items.map((i) => i.taskId).filter((x): x is string => Boolean(x)) } },
        select: { id: true, project: { select: { color: true } }, learningPath: { select: { color: true } } },
      }),
      db.project.findMany({ select: { id: true, color: true } }),
      db.learningPath.findMany({ select: { id: true, color: true } }),
    ]);
    const color = new Map<string, string | null>([
      ...taskLinks.map((t) => [t.id, t.project?.color ?? t.learningPath?.color ?? null] as [string, string | null]),
      ...projects.map((p) => [p.id, p.color] as [string, string]),
      ...paths.map((p) => [p.id, p.color] as [string, string]),
    ]);
    const items = plan.items.map((i) => ({ ...i, color: color.get(i.taskId ?? i.projectId ?? i.learningPathId ?? "") ?? null }));
    return NextResponse.json({ summary: plan.summary, items, fixed: frame.fixed, shape: frame.shape, capacity: frame.capacity });
  } catch (error) {
    if (error instanceof AiError) return NextResponse.json({ error: error.message }, { status: 502 });
    console.error("Plan my day failed", error);
    return NextResponse.json({ error: "Something went wrong while planning. Please try again." }, { status: 500 });
  }
}
