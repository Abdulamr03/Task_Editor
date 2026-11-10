"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass } from "@/components/ui";
import { addDays } from "./task-list";

// ‹ previous day · Today · next day › and a date field to jump anywhere.
export function DayPicker({ day, todayDate }: { day: string; todayDate: string }) {
  const router = useRouter();
  const href = (d: string) => (d === todayDate ? "/tasks" : `/tasks?date=${d}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href(addDays(day, -1))} className={buttonClass.secondary} aria-label="Previous day">
        ‹
      </Link>
      <Link href="/tasks" className={buttonClass.secondary} aria-current={day === todayDate ? "date" : undefined}>
        Today
      </Link>
      <Link href={href(addDays(day, 1))} className={buttonClass.secondary} aria-label="Next day">
        ›
      </Link>
      <input
        type="date"
        aria-label="Go to date"
        value={day}
        onChange={(e) => e.target.value && router.push(href(e.target.value))}
        className={`${inputClass.replace("w-full", "w-40")} py-1.5 text-sm`}
      />
    </div>
  );
}
