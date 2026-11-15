import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { courseProgress } from "@/lib/courses";

// Achievements are earned when a course, a learning path or a project is
// finished. Once earned they stay (they record the day), even if something is
// unticked later; they can be removed by hand on the Achievements page.

type Tx = Prisma.TransactionClient;

export const KIND_LABEL = { COURSE: "Course completed", LEARNING_PATH: "Learning path completed", PROJECT: "Project done" } as const;
export const KIND_ICON = { COURSE: "🎓", LEARNING_PATH: "🧭", PROJECT: "🚀" } as const;

// Checks a course after its content changed. When every lesson is done it is
// marked complete, its linked learning levels are ticked, and achievements are
// earned (for the course, and for any learning path that is now finished).
// Returns the titles of achievements earned just now.
export async function syncCourse(courseId: string, tx: Tx = db): Promise<string[]> {
  const course = await tx.course.findUnique({
    where: { id: courseId },
    include: { items: { select: { heading: true, done: true } }, steps: { select: { id: true, learningPathId: true } } },
  });
  if (!course) return [];
  const { done, total } = courseProgress(course.items);
  const complete = total > 0 && done === total;

  if (!complete) {
    if (course.completedAt) await tx.course.update({ where: { id: courseId }, data: { completedAt: null } });
    return [];
  }
  if (course.completedAt) return [];

  const now = new Date();
  await tx.course.update({ where: { id: courseId }, data: { completedAt: now } });
  await tx.learningStep.updateMany({ where: { courseId, done: false }, data: { done: true, doneAt: now } });
  const earned: string[] = [];
  if (await award(tx, { kind: "COURSE", courseId, title: course.title, detail: `${total} lesson${total === 1 ? "" : "s"}${course.provider ? ` · ${course.provider}` : ""}` })) {
    earned.push(course.title);
  }
  earned.push(...(await checkPaths([...new Set(course.steps.map((s) => s.learningPathId))], tx)));
  return earned;
}

// Earns "learning path completed" for paths whose levels are all done.
export async function checkPaths(pathIds: string[], tx: Tx = db): Promise<string[]> {
  if (pathIds.length === 0) return [];
  const paths = await tx.learningPath.findMany({
    where: { id: { in: pathIds }, achievement: null },
    include: { steps: { select: { done: true } } },
  });
  const earned: string[] = [];
  for (const p of paths) {
    if (p.steps.length === 0 || p.steps.some((s) => !s.done)) continue;
    const n = p.steps.length;
    if (await award(tx, { kind: "LEARNING_PATH", learningPathId: p.id, title: p.title, detail: `${n} level${n === 1 ? "" : "s"}` })) earned.push(p.title);
  }
  return earned;
}

// Earns "project done" when a project's status is Done.
export async function checkProject(projectId: string, tx: Tx = db): Promise<string[]> {
  const p = await tx.project.findUnique({ where: { id: projectId }, include: { achievement: true, tasks: { select: { status: true } } } });
  if (!p || p.status !== "DONE" || p.achievement) return [];
  const doneTasks = p.tasks.filter((t) => t.status === "DONE").length;
  const ok = await award(tx, { kind: "PROJECT", projectId, title: p.name, detail: doneTasks ? `${doneTasks} task${doneTasks === 1 ? "" : "s"} done` : null });
  return ok ? [p.name] : [];
}

async function award(
  tx: Tx,
  data: { kind: "COURSE" | "LEARNING_PATH" | "PROJECT"; title: string; detail: string | null; courseId?: string; learningPathId?: string; projectId?: string },
): Promise<boolean> {
  // The unique link stops the same thing being awarded twice.
  const r = await tx.achievement.createMany({ data: [data], skipDuplicates: true });
  return r.count > 0;
}
