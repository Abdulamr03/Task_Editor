import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseDateInput, toDateInput, today } from "@/lib/dates";
import { addDaysUTC, mondayOf } from "@/lib/time-stats";
import { getLinkGroups } from "@/lib/task-links";
import { formatMinutes } from "@/lib/tasks";
import { buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { TimeEntries } from "./time-entries";
import { LogTime } from "./log-time";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function TimePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const { week } = await searchParams;

  const todayDay = today();
  const parsed = parseDateInput(week ?? null);
  const start = mondayOf(parsed && parsed !== "invalid" ? parsed : todayDay);
  const end = addDaysUTC(start, 7);
  const isThisWeek = start.getTime() === mondayOf(todayDay).getTime();

  const [entries, links] = await Promise.all([
    db.timeLog.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        project: { select: { id: true, name: true, color: true } },
        learningPath: { select: { id: true, title: true, color: true } },
      },
    }),
    isAdmin ? getLinkGroups() : Promise.resolve({ projects: [], paths: [] }),
  ]);

  // Totals per project / learning path, biggest first.
  const totals = new Map<string, { label: string; color: string; minutes: number; href?: string }>();
  for (const e of entries) {
    const key = e.project ? `p:${e.project.id}` : e.learningPath ? `l:${e.learningPath.id}` : "none";
    const row =
      totals.get(key) ??
      (e.project
        ? { label: e.project.name, color: e.project.color, minutes: 0, href: `/projects/${e.project.id}` }
        : e.learningPath
          ? { label: e.learningPath.title, color: e.learningPath.color, minutes: 0, href: `/learning/${e.learningPath.id}` }
          : { label: "Not linked", color: "#94a3b8", minutes: 0 });
    row.minutes += e.minutes;
    totals.set(key, row);
  }
  const rows = [...totals.values()].sort((a, b) => b.minutes - a.minutes);
  const total = rows.reduce((s, r) => s + r.minutes, 0);
  const max = Math.max(1, ...rows.map((r) => r.minutes));

  const weekHref = (d: Date) => (d.getTime() === mondayOf(todayDay).getTime() ? "/time" : `/time?week=${toDateInput(d)}`);
  // New entries default to today, or to the Monday of a past or future week.
  const formDate = isThisWeek ? toDateInput(todayDay) : toDateInput(start);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader title="Time log" />

      <div className="-mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-500">
          {isThisWeek ? "This week" : "Week"} · {fmt(start)} – {fmt(addDaysUTC(end, -1))}
        </p>
        <div className="flex gap-2">
          <Link href={weekHref(addDaysUTC(start, -7))} className={buttonClass.secondary} aria-label="Previous week">
            ‹
          </Link>
          <Link href="/time" className={buttonClass.secondary}>
            This week
          </Link>
          <Link href={weekHref(addDaysUTC(start, 7))} className={buttonClass.secondary} aria-label="Next week">
            ›
          </Link>
        </div>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="mb-3 font-semibold">Log time</h2>
          {/* key: start fresh when the week changes */}
          <LogTime key={formDate} links={links} date={formDate} />
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Total: {total ? formatMinutes(total) : "nothing logged"}
        </h2>
        {rows.length > 0 && (
          <Card>
            <ul className="flex flex-col gap-3">
              {rows.map((r) => (
                <li
                  key={r.label}
                  // Phones: name and time on one line, the bar under them. Wider: one row.
                  className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
                >
                  <span className="truncate">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.href ? (
                      <Link href={r.href} className="hover:underline">
                        {r.label}
                      </Link>
                    ) : (
                      <span className="text-slate-500">{r.label}</span>
                    )}
                  </span>
                  <span className="order-last col-span-2 h-2 sm:order-none sm:col-span-1" aria-hidden="true">
                    <span className="block h-2 rounded-r" style={{ width: `${(r.minutes / max) * 100}%`, backgroundColor: r.color }} />
                  </span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-300">
                    {formatMinutes(r.minutes)} <span className="text-slate-400">· {Math.round((r.minutes / total) * 100)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Entries</h2>
        {entries.length === 0 ? (
          <EmptyState>No time logged this week.{isAdmin && " Use the form above to add some."}</EmptyState>
        ) : (
          <TimeEntries
            isAdmin={isAdmin}
            links={links}
            entries={entries.map((e) => ({
              id: e.id,
              date: toDateInput(e.date),
              minutes: e.minutes,
              note: e.note,
              project: e.project,
              learningPath: e.learningPath,
            }))}
          />
        )}
      </section>
    </main>
  );
}
