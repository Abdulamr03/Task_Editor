import { db } from "@/lib/db";
import { today } from "@/lib/dates";

// Numbers for the dashboard. "Days" are calendar days on the server's clock,
// written as "YYYY-MM-DD".

function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayText(utcMidnight: Date): string {
  return utcMidnight.toISOString().slice(0, 10);
}

function addDays(utcMidnight: Date, n: number): Date {
  const d = new Date(utcMidnight);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// Days in a row with at least one finished task or learning step.
// Today counts once something is done; until then the streak from yesterday
// is still shown, so it doesn't "break" first thing in the morning.
export async function getStreak(): Promise<{ days: number; doneToday: boolean }> {
  const since = new Date(Date.now() - 400 * 86_400_000);
  const [tasks, steps] = await Promise.all([
    db.task.findMany({ where: { status: "DONE", completedAt: { gte: since } }, select: { completedAt: true } }),
    db.learningStep.findMany({ where: { done: true, doneAt: { gte: since } }, select: { doneAt: true } }),
  ]);
  const active = new Set<string>();
  for (const t of tasks) if (t.completedAt) active.add(localDay(t.completedAt));
  for (const s of steps) if (s.doneAt) active.add(localDay(s.doneAt));

  const todayDay = today();
  const doneToday = active.has(dayText(todayDay));
  let day = doneToday ? todayDay : addDays(todayDay, -1);
  let days = 0;
  while (active.has(dayText(day))) {
    days++;
    day = addDays(day, -1);
  }
  return { days, doneToday };
}

export type WeekDay = { day: string; label: string; done: number; isToday: boolean; isFuture: boolean };

// Tasks finished on each day of this week (Monday to Sunday), and the
// planned minutes of those tasks.
export async function getThisWeek(): Promise<{ days: WeekDay[]; total: number; minutes: number }> {
  const todayDay = today();
  const monday = addDays(todayDay, -((todayDay.getUTCDay() + 6) % 7));
  const start = new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()); // local midnight
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);

  const done = await db.task.findMany({
    where: { status: "DONE", completedAt: { gte: start, lt: end } },
    select: { completedAt: true, estimateMinutes: true },
  });
  const counts = new Map<string, number>();
  let minutes = 0;
  for (const t of done) {
    const key = localDay(t.completedAt!);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    minutes += t.estimateMinutes ?? 0;
  }

  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const key = dayText(d);
    return {
      day: key,
      label: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
      done: counts.get(key) ?? 0,
      isToday: d.getTime() === todayDay.getTime(),
      isFuture: d.getTime() > todayDay.getTime(),
    };
  });
  return { days, total: done.length, minutes };
}
