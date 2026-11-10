import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { today } from "@/lib/dates";

// Monday of the week that contains `day` (dates are midnight UTC).
export function mondayOf(day: Date): Date {
  const d = new Date(day);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

export function addDaysUTC(day: Date, n: number): Date {
  const d = new Date(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function thisWeek(): { start: Date; end: Date } {
  const start = mondayOf(today());
  return { start, end: addDaysUTC(start, 7) };
}

// Total minutes logged, all time and this week, for a filter
// (e.g. one project). Used on project and learning path pages.
export async function getTimeTotals(where: Prisma.TimeLogWhereInput): Promise<{ total: number; week: number }> {
  const { start, end } = thisWeek();
  const [all, week] = await Promise.all([
    db.timeLog.aggregate({ where, _sum: { minutes: true } }),
    db.timeLog.aggregate({ where: { ...where, date: { gte: start, lt: end } }, _sum: { minutes: true } }),
  ]);
  return { total: all._sum.minutes ?? 0, week: week._sum.minutes ?? 0 };
}
