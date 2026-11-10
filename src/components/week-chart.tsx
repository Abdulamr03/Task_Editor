import Link from "next/link";
import type { WeekDay } from "@/lib/stats";

// "Tasks done this week": one bar per day, Monday to Sunday.
// Hover or focus a bar to see its number; today's bar is labelled directly.
// The same numbers are in a table for screen readers.
export function WeekChart({ days }: { days: WeekDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.done));
  // Round the top of the scale up to a tidy number for the guide line
  // (up to 5: exact; then even numbers; past 20: multiples of 5).
  const top = max <= 5 ? max : max <= 20 ? Math.ceil(max / 2) * 2 : Math.ceil(max / 5) * 5;

  return (
    <figure>
      <div className="relative flex h-36 items-end gap-0.5 border-b border-slate-300 dark:border-slate-600" aria-hidden="true">
        {/* Light guide at the top value. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200 dark:border-slate-700" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] leading-none text-slate-400 dark:bg-slate-900">
          {top}
        </span>
        {days.map((d) => {
          const height = d.done === 0 ? 0 : Math.max(4, (d.done / top) * 100);
          return (
            <Link
              key={d.day}
              href={`/tasks?date=${d.day}`}
              tabIndex={-1}
              className="group relative flex h-full flex-1 items-end justify-center rounded-t outline-none hover:bg-slate-500/5"
            >
              {d.isToday && d.done > 0 && (
                <span className="absolute text-xs font-medium text-slate-700 dark:text-slate-200" style={{ bottom: `calc(${height}% + 4px)` }}>
                  {d.done}
                </span>
              )}
              <span
                className="block w-full max-w-8 rounded-t bg-[#2a78d6] dark:bg-[#3987e5]"
                style={{ height: `${height}%`, opacity: d.isToday ? 1 : 0.85 }}
              />
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow group-hover:block dark:bg-slate-100 dark:text-slate-900">
                {d.label}: {d.done} done
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-1 flex gap-0.5" aria-hidden="true">
        {days.map((d) => (
          <span
            key={d.day}
            className={`flex-1 text-center text-xs ${d.isToday ? "font-semibold text-slate-900 dark:text-slate-100" : d.isFuture ? "text-slate-300 dark:text-slate-600" : "text-slate-500"}`}
          >
            {d.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Tasks done each day this week</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.label}</th>
              <td>{d.done}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
