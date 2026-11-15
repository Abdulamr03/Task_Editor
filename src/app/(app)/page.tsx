import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toDateInput, today } from "@/lib/dates";
import { createRecurringTasksForToday } from "@/lib/recurring";
import { getLinkGroups } from "@/lib/task-links";
import { sortTasks, taskInclude, toTaskItem } from "@/lib/task-items";
import { getProjectProgress } from "@/lib/project-progress";
import { getLearningProgress } from "@/lib/learning-progress";
import { getStreak, getThisWeek } from "@/lib/stats";
import { getTimeTotals } from "@/lib/time-stats";
import { formatMinutes } from "@/lib/tasks";
import { Card, ProgressBar } from "@/components/ui";
import { courseProgress } from "@/lib/courses";
import { KIND_ICON } from "@/lib/achievements";
import { DueLabel } from "@/components/due-label";
import { WeekChart } from "@/components/week-chart";
import { TaskList } from "./tasks/task-list";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const todayDay = today();
  const todayText = toDateInput(todayDay);

  await createRecurringTasksForToday();

  const [todayTasks, overdueCount, projects, paths, streak, week, links, logged] = await Promise.all([
    db.task.findMany({ where: { date: todayDay }, include: taskInclude }),
    db.task.count({ where: { date: { lt: todayDay }, status: { not: "DONE" }, recurringTaskId: null } }),
    db.project.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 6,
    }),
    db.learningPath.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        steps: { where: { done: false }, orderBy: [{ milestone: { order: "asc" } }, { order: "asc" }], take: 1, select: { title: true } },
      },
    }),
    getStreak(),
    getThisWeek(),
    isAdmin ? getLinkGroups() : Promise.resolve({ projects: [], paths: [] }),
    getTimeTotals({}),
  ]);
  // Courses being studied and the latest achievements.
  const [studying, latest, achievementCount] = await Promise.all([
    db.course.findMany({ where: { completedAt: null }, orderBy: { updatedAt: "desc" }, take: 4, include: { items: { select: { heading: true, done: true } } } }),
    db.achievement.findMany({ orderBy: { earnedAt: "desc" }, take: 3 }),
    db.achievement.count(),
  ]);
  const [projectProgress, pathProgress] = await Promise.all([
    getProjectProgress(projects.map((p) => p.id)),
    getLearningProgress(paths.map((p) => p.id)),
  ]);

  const open = sortTasks(todayTasks.filter((t) => t.status !== "DONE"));
  const doneToday = todayTasks.length - open.length;
  const minutesLeft = open.reduce((s, t) => s + (t.estimateMinutes ?? 0), 0);

  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          {greeting()}, {user.name}
        </h1>
        <p className="mt-1 text-slate-500">
          {todayDay.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          href="/tasks"
          label="Today"
          value={todayTasks.length === 0 ? "—" : `${doneToday} / ${todayTasks.length}`}
          note={todayTasks.length === 0 ? "Nothing planned yet" : minutesLeft ? `about ${formatMinutes(minutesLeft)} left` : open.length ? `${open.length} to do` : "All done 🎉"}
        />
        <Tile
          href="/tasks"
          label="Overdue"
          value={String(overdueCount)}
          note={overdueCount ? "unfinished from earlier days" : "Nothing overdue"}
          alert={overdueCount > 0}
        />
        <Tile
          label="Streak"
          value={`${streak.days} ${streak.days === 1 ? "day" : "days"}`}
          note={
            streak.days === 0
              ? "Finish something to start one"
              : streak.doneToday
                ? "in a row with something done 🔥"
                : "finish something today to keep it"
          }
        />
        <Tile
          label="This week"
          value={`${week.total} done`}
          note={
            logged.week
              ? `${formatMinutes(logged.week)} logged`
              : week.minutes
                ? `about ${formatMinutes(week.minutes)} of planned time`
                : "tasks finished since Monday"
          }
          href={logged.week ? "/time" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's open tasks */}
        <section className="flex flex-col gap-3 lg:col-span-2">
          <SectionTitle title="To do today" href="/tasks" linkLabel="Open Today →" />
          {open.length > 0 ? (
            <TaskList tasks={open.map(toTaskItem)} isAdmin={isAdmin} links={links} todayDate={todayText} />
          ) : (
            <Card className="text-center text-sm text-slate-500">
              {todayTasks.length > 0 ? "Everything for today is done 🎉" : "No tasks for today yet."}{" "}
              <Link href="/tasks" className="text-blue-600 hover:underline dark:text-blue-400">
                {isAdmin ? "Plan your day →" : "See Today →"}
              </Link>
            </Card>
          )}
        </section>

        {/* Week chart */}
        <section className="flex flex-col gap-3">
          <SectionTitle title="Tasks done this week" />
          <Card>
            <WeekChart days={week.days} />
          </Card>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionTitle title="Active projects" href="/projects" linkLabel="All projects →" />
          {projects.length === 0 ? (
            <Card className="text-sm text-slate-500">No active projects.</Card>
          ) : (
            <Card padded={false} className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
              {projects.map((p) => {
                const prog = projectProgress.get(p.id) ?? { done: 0, total: 0 };
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex flex-col gap-2 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                      {p.dueDate && <DueLabel date={p.dueDate} done={false} />}
                    </div>
                    <ProgressBar done={prog.done} total={prog.total} color={p.color} />
                  </Link>
                );
              })}
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle title="Learning" href="/learning" linkLabel="All learning paths →" />
          {paths.length === 0 ? (
            <Card className="text-sm text-slate-500">No active learning paths.</Card>
          ) : (
            <Card padded={false} className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
              {paths.map((p) => {
                const prog = pathProgress.get(p.id) ?? { done: 0, total: 0 };
                return (
                  <Link key={p.id} href={`/learning/${p.id}`} className="flex flex-col gap-2 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.title}
                      </span>
                      {p.steps[0] && <span className="truncate text-sm text-slate-500">Next: {p.steps[0].title}</span>}
                    </div>
                    <ProgressBar done={prog.done} total={prog.total} color={p.color} unit="steps" />
                  </Link>
                );
              })}
            </Card>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <SectionTitle title="Courses" href="/courses" linkLabel="All courses →" />
          {studying.length === 0 ? (
            <Card className="text-sm text-slate-500">No courses in progress.</Card>
          ) : (
            <Card padded={false} className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
              {studying.map((c) => {
                const prog = courseProgress(c.items);
                return (
                  <Link key={c.id} href={`/courses/${c.id}`} className="flex flex-col gap-2 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span className="font-medium">
                      🎓 {c.title}
                      {c.provider && <span className="ml-2 text-sm font-normal text-slate-500">{c.provider}</span>}
                    </span>
                    <ProgressBar done={prog.done} total={prog.total} color="#0ea5e9" unit="lessons" />
                  </Link>
                );
              })}
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle title={`Achievements · ${achievementCount}`} href="/achievements" linkLabel="All achievements →" />
          {latest.length === 0 ? (
            <Card className="text-sm text-slate-500">Finish a course, a learning path or a project to earn your first 🏆.</Card>
          ) : (
            <Card padded={false} className="flex flex-col divide-y divide-slate-200 dark:divide-slate-700">
              {latest.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <span aria-hidden="true" className="text-xl">{KIND_ICON[a.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.title}</span>
                    <span className="text-xs text-slate-500">{a.earnedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </span>
                  <span aria-hidden="true">🏆</span>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}

function Tile({ label, value, note, href, alert = false }: { label: string; value: string; note: string; href?: string; alert?: boolean }) {
  const body = (
    <Card padded={false} className={`h-full p-4 ${href ? "transition hover:shadow-md" : ""}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${alert ? "text-red-600 dark:text-red-400" : ""}`}>
        {alert && <span aria-hidden="true">⚠ </span>}
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-blue-500">
      {body}
    </Link>
  ) : (
    body
  );
}

function SectionTitle({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {href && (
        <Link href={href} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
