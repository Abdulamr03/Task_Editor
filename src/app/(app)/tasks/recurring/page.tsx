import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLinkGroups } from "@/lib/task-links";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { RecurringList } from "./recurring-list";
import { AddRecurring } from "./add-recurring";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [items, links] = await Promise.all([
    db.recurringTask.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      include: { project: { select: { name: true, color: true } }, learningPath: { select: { title: true, color: true } } },
    }),
    isAdmin ? getLinkGroups() : Promise.resolve({ projects: [], paths: [] }),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Recurring tasks" back={{ href: "/tasks", label: "Today" }} />
      <p className="-mt-4 text-sm text-slate-500">
        These are added to <strong>Today</strong> automatically, every day or on weekdays only. Pause one to stop it for a while.
      </p>

      {items.length === 0 ? (
        <EmptyState>No recurring tasks yet.</EmptyState>
      ) : (
        <RecurringList
          isAdmin={isAdmin}
          items={items.map((r) => ({
            id: r.id,
            title: r.title,
            rule: r.rule,
            priority: r.priority,
            estimateMinutes: r.estimateMinutes,
            active: r.active,
            linkLabel: r.project?.name ?? r.learningPath?.title ?? null,
            linkColor: r.project?.color ?? r.learningPath?.color ?? null,
          }))}
        />
      )}

      {isAdmin && (
        <Card>
          <h2 className="mb-3 font-semibold">New recurring task</h2>
          <AddRecurring links={links} />
        </Card>
      )}
    </main>
  );
}
