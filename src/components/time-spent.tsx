import Link from "next/link";
import { Card } from "@/components/ui";
import { formatMinutes } from "@/lib/tasks";

// "Time spent" card on a project's or learning path's page.
export function TimeSpent({ total, week, color }: { total: number; week: number; color: string }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Time spent</h2>
      {total === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing logged yet.{" "}
          <Link href="/time" className="text-blue-600 hover:underline dark:text-blue-400">
            Log time →
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p>
            <span className="text-2xl font-semibold" style={{ color }}>
              {formatMinutes(total)}
            </span>{" "}
            <span className="text-sm text-slate-500">in total</span>
          </p>
          <p className="text-sm text-slate-500">
            {formatMinutes(week)} this week ·{" "}
            <Link href="/time" className="text-blue-600 hover:underline dark:text-blue-400">
              Time log →
            </Link>
          </p>
        </div>
      )}
    </Card>
  );
}
