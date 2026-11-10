import { db } from "@/lib/db";

export type Progress = { done: number; total: number };

// Finished and total tasks for each project, in one query.
export async function getProjectProgress(projectIds: string[]): Promise<Map<string, Progress>> {
  const rows = await db.task.groupBy({
    by: ["projectId", "status"],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });
  const progress = new Map<string, Progress>(projectIds.map((id) => [id, { done: 0, total: 0 }]));
  for (const row of rows) {
    const p = row.projectId && progress.get(row.projectId);
    if (!p) continue;
    p.total += row._count._all;
    if (row.status === "DONE") p.done += row._count._all;
  }
  return progress;
}
