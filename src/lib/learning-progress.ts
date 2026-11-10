import { db } from "@/lib/db";
import type { Progress } from "@/lib/project-progress";

// Finished and total steps for each learning path, in one query.
export async function getLearningProgress(pathIds: string[]): Promise<Map<string, Progress>> {
  const rows = await db.learningStep.groupBy({
    by: ["learningPathId", "done"],
    where: { learningPathId: { in: pathIds } },
    _count: { _all: true },
  });
  const progress = new Map<string, Progress>(pathIds.map((id) => [id, { done: 0, total: 0 }]));
  for (const row of rows) {
    const p = progress.get(row.learningPathId);
    if (!p) continue;
    p.total += row._count._all;
    if (row.done) p.done += row._count._all;
  }
  return progress;
}
