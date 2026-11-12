import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateInput, toDateInput, today } from "@/lib/dates";
import { createRecurringTasksForToday } from "@/lib/recurring";
import { getLinkGroups } from "@/lib/task-links";
import { sortTasks, taskInclude, toTaskItem } from "@/lib/task-items";
import { formatMinutes } from "@/lib/tasks";
import { buttonClass, EmptyState, PageHeader } from "@/components/ui";
import { TaskList } from "./task-list";
import { DayPicker } from "./day-picker";
import { QuickAdd } from "./quick-add";
import { CarryOverButton } from "./carry-over-button";
import { PlannerPanel, SavedPlan } from "./plan/plan-view";
import { hasApiKey } from "@/lib/ai/client";
import { getPlannerSettings } from "@/lib/planner/settings";
import { METHODS } from "@/lib/planner/prayers";
import { minutesInZone, toHHMM } from "@/lib/planner/time";
import type { Block } from "@/lib/planner/pack";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const { date } = await searchParams;

  const todayDay = today();
  const parsed = parseDateInput(date ?? null);
  const day = parsed && parsed !== "invalid" ? parsed : todayDay;
  const isToday = day.getTime() === todayDay.getTime();

  // Today's recurring tasks appear the first time today is opened.
  if (isToday) await createRecurringTasksForToday();

  const [dayTasks, overdue, links, plan, planner] = await Promise.all([
    db.task.findMany({ where: { date: day }, include: taskInclude }),
    isToday
      ? db.task.findMany({
          where: { date: { lt: todayDay }, status: { not: "DONE" }, recurringTaskId: null },
          include: taskInclude,
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    isAdmin ? getLinkGroups() : Promise.resolve({ projects: [], paths: [] }),
    db.dayPlan.findUnique({ where: { date: day } }),
    getPlannerSettings(),
  ]);
  const planBlocks = (plan?.blocks ?? []) as unknown as Block[];
  const planStatus = Object.fromEntries(dayTasks.map((t) => [t.id, t.status]));
  const canPlan = isAdmin && day >= todayDay;
  const methodLabel = METHODS.find((m) => m.value === planner.method)?.label ?? planner.method;
  const placeInfo =
    `Working ${toHHMM(planner.dayStart)}–${toHHMM(planner.dayEnd)} · focus blocks up to ${planner.maxBlock} min with ${planner.breakMinutes}-min breaks` +
    (planner.lunchMinutes ? ` · lunch ${toHHMM(planner.lunchStart)}` : "") +
    (planner.prayersEnabled ? ` · prayer times for ${planner.locationName} (${methodLabel})` : "") +
    ". Change these in Settings → Day planner.";

  const sorted = sortTasks(dayTasks);
  const open = sorted.filter((t) => t.status !== "DONE");
  const done = sorted.filter((t) => t.status === "DONE");
  const minutesLeft = open.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0);
  const dayText = toDateInput(day);
  const todayText = toDateInput(todayDay);

  const heading = isToday
    ? "Today"
    : day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title={heading}
        actions={
          <Link href="/tasks/recurring" className={buttonClass.secondary}>
            ↻ Recurring tasks
          </Link>
        }
      />

      <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {isToday && day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) + " · "}
          {sorted.length === 0
            ? "Nothing planned"
            : `${done.length} of ${sorted.length} done${minutesLeft ? ` · about ${formatMinutes(minutesLeft)} left` : ""}`}
        </p>
        <DayPicker day={dayText} todayDate={todayText} />
      </div>

      {canPlan && (
        <div className="flex flex-wrap gap-2">
          <PlannerPanel
            day={dayText}
            hasKey={hasApiKey()}
            hasPlan={Boolean(plan)}
            placeInfo={placeInfo}
            nowStart={isToday ? Math.ceil(minutesInZone(new Date(), planner.timeZone) / 5) * 5 : null}
            dayStart={planner.dayStart}
            dayEnd={planner.dayEnd}
            tomorrowHref={`/tasks?date=${toDateInput(new Date(todayDay.getTime() + 86_400_000))}`}
          />
        </div>
      )}
      {plan && (
        <SavedPlan
          day={dayText}
          blocks={planBlocks}
          summary={plan.summary}
          tasks={planStatus}
          nowMinutes={isToday ? minutesInZone(new Date(), planner.timeZone) : null}
          isAdmin={isAdmin}
        />
      )}

      {isAdmin && <QuickAdd day={dayText} links={links} />}

      {overdue.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Unfinished from earlier ({overdue.length})</h2>
            {isAdmin && <CarryOverButton count={overdue.length} />}
          </div>
          <TaskList tasks={overdue.map(toTaskItem)} isAdmin={isAdmin} links={links} todayDate={todayText} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        {open.length > 0 ? (
          <TaskList tasks={open.map(toTaskItem)} isAdmin={isAdmin} links={links} todayDate={todayText} />
        ) : (
          <EmptyState>
            {done.length > 0 ? "All done for this day 🎉" : isAdmin ? "No tasks for this day. Add one above." : "No tasks for this day."}
          </EmptyState>
        )}
      </section>

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-500">Done ({done.length})</h2>
          <TaskList tasks={done.map(toTaskItem)} isAdmin={isAdmin} links={links} todayDate={todayText} />
        </section>
      )}
    </main>
  );
}
