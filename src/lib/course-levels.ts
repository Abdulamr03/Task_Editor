import { db } from "@/lib/db";

// Learning levels a course can be linked to, grouped by learning path.
export async function getLevelChoices() {
  const paths = await db.learningPath.findMany({
    where: { OR: [{ status: { not: "ARCHIVED" } }, { steps: { some: { courseId: { not: null } } } }] },
    orderBy: { createdAt: "desc" },
    include: {
      steps: {
        orderBy: [{ milestone: { order: "asc" } }, { order: "asc" }],
        select: { id: true, title: true, done: true, courseId: true, milestone: { select: { title: true } }, course: { select: { title: true } } },
      },
    },
  });
  return paths
    .filter((p) => p.steps.length > 0)
    .map((p) => ({
      id: p.id,
      title: p.title,
      color: p.color,
      steps: p.steps.map((s) => ({
        id: s.id,
        title: s.title,
        done: s.done,
        milestone: s.milestone?.title ?? null,
        courseId: s.courseId,
        courseTitle: s.course?.title ?? null,
      })),
    }));
}

export type LevelChoices = Awaited<ReturnType<typeof getLevelChoices>>;
