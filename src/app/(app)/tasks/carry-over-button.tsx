"use client";

import { useTransition } from "react";
import { buttonClass } from "@/components/ui";
import { carryOverAll } from "./actions";

export function CarryOverButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button type="button" disabled={pending} className={buttonClass.secondary} onClick={() => startTransition(() => carryOverAll())}>
      {pending ? "Moving…" : `Move all ${count} to today`}
    </button>
  );
}
