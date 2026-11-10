import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDateInput, today } from "@/lib/dates";
import { getLinkGroups } from "@/lib/task-links";
import { sortTasks, taskInclude, toTaskItem } from "@/lib/task-items";
import { TaskList } from "@/app/(app)/tasks/task-list";
import { EmptyState } from "@/components/ui";

// "Tasks" section on a project's or learning path's page:
// every unfinished task (any day) and the 10 most recently finished.
export async function LinkedTasks({ where, isAdmin }: { where: Prisma.TaskWhereInput; isAdmin: boolean }) {
  const [open, done, links] = await Promise.all([
    db.task.findMany({ where: { ...where, status: { not: "DONE" } }, include: taskInclude, orderBy: { date: "asc" } }),
    db.task.findMany({ where: { ...where, status: "DONE" }, include: taskInclude, orderBy: { completedAt: "desc" }, take: 10 }),
    isAdmin ? getLinkGroups() : Promise.resolve({ projects: [], paths: [] }),
  ]);
  const todayText = toDateInput(today());

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Link href="/tasks" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Plan tasks on Today →
        </Link>
      </div>
      {open.length === 0 && done.length === 0 ? (
        <EmptyState>No tasks linked yet. When adding a task on Today, choose this under “Project / learning path”.</EmptyState>
      ) : (
        <>
          {open.length > 0 && (
            <TaskList tasks={open.map(toTaskItem)} isAdmin={isAdmin} links={links} todayDate={todayText} showDate />
          )}
          {done.length > 0 && (
            <>
              <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Recently done</h3>
              <TaskList tasks={sortTasks(done).map(toTaskItem)} isAdmin={isAdmin} links={links} todayDate={todayText} showDate />
            </>
          )}
        </>
      )}
    </section>
  );
}
