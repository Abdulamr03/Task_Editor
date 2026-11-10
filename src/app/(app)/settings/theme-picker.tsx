"use client";

import { useState, useTransition } from "react";
import type { Theme } from "@/lib/theme";
import { setTheme } from "./actions";

const OPTIONS: { value: Theme; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
  { value: "system", label: "System", hint: "Follow your device" },
];

// Changes the colours straight away, then saves the choice.
export function ThemePicker({ initial, compact = false }: { initial: Theme; compact?: boolean }) {
  // Start from what the page is showing now (it may have changed since load).
  const [theme, setLocal] = useState<Theme>(() => {
    const current = typeof document !== "undefined" ? document.documentElement.dataset.theme : undefined;
    return current === "light" || current === "dark" || current === "system" ? current : initial;
  });
  const [, startTransition] = useTransition();

  const choose = (t: Theme) => {
    setLocal(t);
    document.documentElement.dataset.theme = t;
    startTransition(() => setTheme(t));
  };

  if (compact) {
    return (
      <div role="radiogroup" aria-label="Appearance" className="flex rounded-md border border-slate-300 p-0.5 dark:border-slate-600">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={theme === o.value}
            onClick={() => choose(o.value)}
            className={`flex-1 rounded px-2 py-1 text-xs ${
              theme === o.value ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Appearance" className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => choose(o.value)}
          className={`rounded-xl border-2 p-3 text-left transition ${
            theme === o.value ? "border-blue-600" : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
          }`}
        >
          <Preview kind={o.value} />
          <span className="mt-2 block font-medium">{o.label}</span>
          <span className="block text-xs text-slate-500">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}

// A tiny drawing of the app in that theme.
function Preview({ kind }: { kind: Theme }) {
  const light = (
    <span className="flex h-full flex-col gap-1 bg-slate-50 p-2">
      <span className="h-2 w-1/2 rounded bg-slate-300" />
      <span className="h-6 rounded border border-slate-200 bg-white" />
      <span className="h-2 w-3/4 rounded bg-blue-500" />
    </span>
  );
  const dark = (
    <span className="flex h-full flex-col gap-1 bg-slate-900 p-2">
      <span className="h-2 w-1/2 rounded bg-slate-600" />
      <span className="h-6 rounded border border-slate-700 bg-slate-800" />
      <span className="h-2 w-3/4 rounded bg-blue-400" />
    </span>
  );
  return (
    <span className="block h-16 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700" aria-hidden="true">
      {kind === "light" ? light : kind === "dark" ? dark : (
        <span className="grid h-full grid-cols-2">
          {light}
          {dark}
        </span>
      )}
    </span>
  );
}
