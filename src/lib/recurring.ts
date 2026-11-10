import { db } from "@/lib/db";
import { today } from "@/lib/dates";

// Adds today's task for every active recurring task that should run today
// and hasn't added one yet. Safe to call on every visit: each template
// adds at most one task per day, even if two pages load at the same moment.
export async function createRecurringTasksForToday(): Promise<void> {
  const day = today();
  const weekday = day.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = weekday === 0 || weekday === 6;

  const due = await db.recurringTask.findMany({
    where: {
      active: true,
      ...(isWeekend ? { rule: "DAILY" } : {}),
      OR: [{ lastCreatedOn: null }, { lastCreatedOn: { lt: day } }],
    },
  });

  for (const r of due) {
    await db.$transaction(async (tx) => {
      // Claim today for this template; if another request already did, stop.
      const claimed = await tx.recurringTask.updateMany({
        where: { id: r.id, OR: [{ lastCreatedOn: null }, { lastCreatedOn: { lt: day } }] },
        data: { lastCreatedOn: day },
      });
      if (claimed.count === 0) return;
      await tx.task.createMany({
        data: [
          {
            title: r.title,
            notes: r.notes,
            date: day,
            priority: r.priority,
            estimateMinutes: r.estimateMinutes,
            projectId: r.projectId,
            learningPathId: r.learningPathId,
            recurringTaskId: r.id,
          },
        ],
        skipDuplicates: true,
      });
    });
  }
}
