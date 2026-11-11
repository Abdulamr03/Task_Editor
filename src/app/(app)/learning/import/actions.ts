"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { cleanPlan } from "@/lib/ai/pdf-plan";
import { PROJECT_COLORS } from "@/lib/projects";

type SaveLevel = { title: string; notes: string | null; estimateMinutes: number | null; difficulty: "EASY" | "MEDIUM" | "HARD" | null; pages: string | null; coveredBy: string | null; markDone: boolean };
type SaveMilestone = { title: string; description: string | null; levels: SaveLevel[] };
export type SavePlan = { title: string; description: string | null; color: string; fileName: string; milestones: SaveMilestone[] };

// Saves the reviewed plan as a new learning path with milestones and levels.
export async function createPathFromPlan(input: SavePlan): Promise<{ error: string } | void> {
  await requireAdmin();

  // Only finished steps can count as "covered".
  const coveredIds = input.milestones.flatMap((m) => m.levels.map((l) => l.coveredBy)).filter((id): id is string => Boolean(id));
  const valid = new Set(
    (await db.learningStep.findMany({ where: { id: { in: coveredIds }, done: true }, select: { id: true } })).map((s) => s.id),
  );
  const plan = cleanPlan(input, valid);
  if (plan.milestones.length === 0) return { error: "Keep at least one milestone with one level." };

  // Keep the user's "mark as done" choice per level (same order as the cleaned plan).
  const markDone = input.milestones
    .filter((m) => m.title?.trim() && m.levels.some((l) => l.title?.trim()))
    .slice(0, 50)
    .map((m) => m.levels.filter((l) => l.title?.trim()).slice(0, 100).map((l) => Boolean(l.markDone)));
  const color = /^#[0-9a-f]{6}$/i.test(input.color) ? input.color.toLowerCase() : PROJECT_COLORS[1];
  const now = new Date();

  const path = await db.$transaction(async (tx) => {
    const created = await tx.learningPath.create({
      data: {
        title: plan.title,
        description: plan.description,
        color,
        notes: `Imported from “${String(input.fileName).slice(0, 120)}” on ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
      },
    });
    let order = 0;
    for (const [mi, m] of plan.milestones.entries()) {
      const milestone = await tx.milestone.create({
        data: { learningPathId: created.id, title: m.title, description: m.description, order: mi + 1 },
      });
      await tx.learningStep.createMany({
        data: m.levels.map((l, li) => {
          const done = Boolean(l.coveredBy && markDone[mi]?.[li]);
          return {
            learningPathId: created.id,
            milestoneId: milestone.id,
            title: l.title,
            notes: l.notes,
            estimateMinutes: l.estimateMinutes,
            difficulty: l.difficulty,
            pages: l.pages,
            coveredById: l.coveredBy,
            order: ++order,
            done,
            doneAt: done ? now : null,
          };
        }),
      });
    }
    return created;
  });

  revalidatePath("/", "layout");
  redirect(`/learning/${path.id}`);
}
