"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COST_LABEL, KIND_ICON, type Resource, type ResourceCost } from "@/lib/resources";

const COST_CLASS: Record<ResourceCost, string> = {
  FREE: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  FREE_AUDIT: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  PAID: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
};

export function CostBadge({ cost, price }: { cost: ResourceCost; price?: string | null }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${COST_CLASS[cost]}`}>
      {COST_LABEL[cost]}
      {cost === "PAID" && price ? ` · ${price}` : ""}
    </span>
  );
}

// "3 resources · 2 free"
export function resourceSummary(list: Resource[]): string {
  const free = list.filter((r) => r.cost !== "PAID").length;
  return `${list.length} resource${list.length === 1 ? "" : "s"}${free ? ` · ${free} free` : ""}`;
}

export function ResourceList({ resources, onAddCourse }: { resources: Resource[]; onAddCourse?: (r: Resource) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {resources.map((r) => (
        <li key={r.url} className="flex items-start gap-2 text-sm">
          <span aria-hidden="true" className="w-4 shrink-0 text-center text-slate-500">
            {KIND_ICON[r.kind]}
          </span>
          <span className="min-w-0 flex-1">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              {r.title} ↗
            </a>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{r.provider}</span>
              <CostBadge cost={r.cost} price={r.price} />
              {r.note && <span>{r.note}</span>}
              {onAddCourse && (r.kind === "course" || r.kind === "video") && (
                <button type="button" onClick={() => onAddCourse(r)} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                  ＋ Add to my courses
                </button>
              )}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Collapsible "📚 Study resources" under a level or a planned study block.
export function ResourcesDisclosure({
  resources,
  searched,
  onSearchAgain,
  onAddCourse,
  busy = false,
}: {
  resources: Resource[];
  searched: boolean;
  onSearchAgain?: () => void;
  // Learning levels: turn a course resource into one of "my courses".
  onAddCourse?: (r: Resource) => void;
  busy?: boolean;
}) {
  if (!searched && resources.length === 0) return null;
  if (resources.length === 0) {
    return (
      <p className="mt-1 text-xs text-slate-500">
        📚 No study resources found.
        {onSearchAgain && (
          <button type="button" disabled={busy} onClick={onSearchAgain} className="ml-2 text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400">
            {busy ? "Searching…" : "Search again"}
          </button>
        )}
      </p>
    );
  }
  return (
    <details className="group mt-1.5 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
      <summary className="cursor-pointer select-none text-sm font-medium text-slate-600 dark:text-slate-300">
        📚 Study resources <span className="font-normal text-slate-500">({resourceSummary(resources)})</span>
      </summary>
      <div className="mt-2">
        <ResourceList resources={resources} onAddCourse={onAddCourse} />
        {onSearchAgain && (
          <button type="button" disabled={busy} onClick={onSearchAgain} className="mt-2 text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400">
            {busy ? "Searching the web…" : "↻ Search again"}
          </button>
        )}
      </div>
    </details>
  );
}

type Answer = {
  resources?: Record<string, Resource[]>;
  searched?: string[];
  remaining?: number;
  refreshBefore?: string | null;
  error?: string;
  note?: string;
};

// Asks the server for these levels' resources, searching the ones never searched
// (a few at a time, until all are done). Calls onUpdate after each round.
export async function fetchResources(
  stepIds: string[],
  options: { refresh?: boolean; onUpdate?: (a: Required<Pick<Answer, "resources" | "searched">>) => void } = {},
): Promise<{ error?: string }> {
  // Search again: the server answers with its time, used for the next rounds.
  let refresh = options.refresh === true;
  let refreshBefore: string | undefined;
  for (let round = 0; round < 20; round++) {
    let data: Answer;
    try {
      const res = await fetch("/learning/resources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stepIds, refresh, refreshBefore }),
      });
      data = await res.json().catch(() => ({ error: "The server's answer couldn't be read." }));
    } catch {
      return { error: "Couldn't reach the app. Is it still running?" };
    }
    if (data.resources) options.onUpdate?.({ resources: data.resources, searched: data.searched ?? [] });
    if (data.error || data.note) return { error: data.error ?? data.note };
    if (!data.remaining) return {};
    if (refresh && data.refreshBefore) {
      refreshBefore = data.refreshBefore;
      refresh = false;
    }
  }
  return {};
}

// "🔎 Find study resources" for a group of levels (learning path page).
export function FindResourcesButton({
  stepIds,
  label = "🔎 Find study resources",
  refresh = false,
  confirmText,
}: {
  stepIds: string[];
  label?: string;
  // Search these levels again even if they have resources.
  refresh?: boolean;
  confirmText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  if (stepIds.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
        onClick={async () => {
          if (confirmText && !confirm(confirmText)) return;
          setBusy(true);
          setError("");
          setSeconds(0);
          timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
          const result = await fetchResources(stepIds, { refresh, onUpdate: () => router.refresh() });
          if (timer.current) clearInterval(timer.current);
          setBusy(false);
          if (result.error) setError(result.error);
          router.refresh();
        }}
      >
        {busy ? "Searching…" : label}
      </button>
      {busy && (
        <span role="status" className="text-sm text-slate-500">
          Claude is searching for video courses (YouTube, Udemy, Coursera…) {seconds}s
        </span>
      )}
      {error && (
        <span role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </span>
  );
}
