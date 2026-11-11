"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TaskStatus } from "@prisma/client";
import { buttonClass, Card, inputClass } from "@/components/ui";
import { DIFFICULTIES, DIFFICULTY_LABEL, formatMinutes } from "@/lib/tasks";
import { pack, type Block, type DayShape, type FixedBlock, type PlanItem } from "@/lib/planner/pack";
import { toHHMM } from "@/lib/planner/time";
import { setTaskStatus } from "../actions";
import { clearPlan, savePlan } from "./actions";

const ICON: Record<Block["kind"], string> = { work: "", break: "☕", prayer: "🕌", lunch: "🍽" };
const KIND_LABEL: Record<PlanItem["kind"], string> = { task: "Task", project: "Project", study: "Study" };

// ---------- The button and the review screen ----------

export function PlannerPanel({
  day,
  hasKey,
  hasPlan,
  placeInfo,
}: {
  day: string;
  hasKey: boolean;
  hasPlan: boolean;
  placeInfo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<{ summary: string; items: PlanItem[]; fixed: FixedBlock[]; shape: DayShape } | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function propose() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/tasks/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date: day, note }) });
      const data = await res.json().catch(() => ({ error: "The server's answer couldn't be read." }));
      if (!res.ok || data.error) setError(data.error ?? "Something went wrong.");
      else setProposal(data);
    } catch {
      setError("Couldn't reach the app. Is it still running?");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={hasPlan ? buttonClass.secondary : buttonClass.primary} onClick={() => setOpen(true)}>
        {hasPlan ? "↻ Re-plan my day" : "🗓 Plan my day"}
      </button>
    );
  }

  return (
    <Card className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Plan my day</h2>
        <button type="button" className="text-sm text-slate-500 hover:underline" onClick={() => { setOpen(false); setProposal(null); setError(""); }}>
          Close
        </button>
      </div>

      {!hasKey ? (
        <p className="text-sm text-slate-500">
          Planning uses Claude. Add <span className="font-mono">ANTHROPIC_API_KEY</span> to your <span className="font-mono">.env</span> file and
          restart the app (same key as Import from PDF).
        </p>
      ) : !proposal ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">{placeInfo}</p>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Anything to know about today? (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              disabled={busy}
              placeholder="e.g. focus on the thesis · keep the afternoon light · 2 hours of Spanish"
              className={inputClass}
            />
          </label>
          {error && <ErrorNote text={error} />}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={propose} disabled={busy} className={buttonClass.primary}>
              {busy ? "Planning…" : "Make my plan"}
            </button>
            {busy && <span role="status" className="text-sm text-slate-500">Claude is planning your day… {seconds}s</span>}
          </div>
          {hasPlan && <p className="text-xs text-slate-500">Making a new plan replaces the current one (finished tasks are kept).</p>}
        </div>
      ) : (
        <Review
          proposal={proposal}
          saving={saving}
          onBack={() => setProposal(null)}
          onSave={(items) =>
            startSaving(async () => {
              const res = await savePlan({ date: day, summary: proposal.summary, items });
              if ("error" in res) setError(res.error);
              else {
                setOpen(false);
                setProposal(null);
                router.refresh();
              }
            })
          }
          error={error}
        />
      )}
    </Card>
  );
}

function Review({
  proposal,
  saving,
  onBack,
  onSave,
  error,
}: {
  proposal: { summary: string; items: PlanItem[]; fixed: FixedBlock[]; shape: DayShape };
  saving: boolean;
  onBack: () => void;
  onSave: (items: PlanItem[]) => void;
  error: string;
}) {
  const [items, setItems] = useState(proposal.items);
  const { blocks, unplaced } = useMemo(() => pack(items, proposal.fixed, proposal.shape), [items, proposal.fixed, proposal.shape]);
  const total = items.reduce((s, i) => s + i.minutes, 0);

  const update = (key: string, change: Partial<PlanItem>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...change } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((xs) => {
      const j = i + dir;
      if (j < 0 || j >= xs.length) return xs;
      const copy = [...xs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  return (
    <div className="flex flex-col gap-4">
      {proposal.summary && <p className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-900 dark:text-blue-100">💡 {proposal.summary}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            What to work on · {formatMinutes(total)}
          </h3>
          <ol className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li key={it.key} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-start gap-2">
                  <span className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color ?? "#94a3b8" }} />
                  <div className="min-w-0 flex-1">
                    {it.kind === "task" ? (
                      <p className="font-medium">{it.title}</p>
                    ) : (
                      <input
                        aria-label="Block title"
                        value={it.title}
                        onChange={(e) => update(it.key, { title: e.target.value })}
                        className="w-full rounded bg-transparent px-1 py-0.5 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 dark:focus:bg-slate-800"
                      />
                    )}
                    <p className="text-xs text-slate-500">
                      {KIND_LABEL[it.kind]}
                      {it.reason ? ` · ${it.reason}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="flex items-center rounded-md border border-slate-300 dark:border-slate-600">
                        <button type="button" aria-label="15 minutes less" className="px-2 py-0.5" onClick={() => update(it.key, { minutes: Math.max(15, it.minutes - 15) })}>−</button>
                        <span className="w-16 text-center tabular-nums">{formatMinutes(it.minutes)}</span>
                        <button type="button" aria-label="15 minutes more" className="px-2 py-0.5" onClick={() => update(it.key, { minutes: Math.min(300, it.minutes + 15) })}>+</button>
                      </span>
                      <select
                        aria-label="Difficulty"
                        value={it.difficulty}
                        onChange={(e) => update(it.key, { difficulty: e.target.value as PlanItem["difficulty"] })}
                        className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 dark:border-slate-600 dark:bg-slate-800"
                      >
                        {DIFFICULTIES.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col">
                    <SmallIcon label="Earlier" disabled={i === 0} onClick={() => move(i, -1)}>↑</SmallIcon>
                    <SmallIcon label="Later" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</SmallIcon>
                    <SmallIcon label="Remove" danger onClick={() => setItems((xs) => xs.filter((x) => x.key !== it.key))}>✕</SmallIcon>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Your day</h3>
          <Timeline blocks={blocks} />
          {unplaced.length > 0 && (
            <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              Doesn&apos;t fit today: {unplaced.map((u) => `${u.title} (${formatMinutes(u.minutes)})`).join(", ")}. Shorten or remove something
              to make room.
            </p>
          )}
        </section>
      </div>
      {error && <ErrorNote text={error} />}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving || items.length === 0} onClick={() => onSave(items)} className={buttonClass.primary}>
          {saving ? "Saving…" : "Use this plan"}
        </button>
        <button type="button" disabled={saving} onClick={onBack} className={buttonClass.secondary}>
          Try again
        </button>
      </div>
    </div>
  );
}

// ---------- The saved plan on Today ----------

export function SavedPlan({
  day,
  blocks,
  summary,
  tasks,
  nowMinutes,
  isAdmin,
}: {
  day: string;
  blocks: Block[];
  summary: string | null;
  tasks: Record<string, TaskStatus>;
  nowMinutes: number | null;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  // Tick straight away; the server catches up a moment later.
  const [status, setStatus] = useOptimistic(tasks, (cur, change: { id: string; status: TaskStatus }) => ({ ...cur, [change.id]: change.status }));
  const work = blocks.filter((b) => b.kind === "work");
  const doneMinutes = work.filter((b) => b.taskId && status[b.taskId] === "DONE").reduce((s, b) => s + b.end - b.start, 0);
  const totalMinutes = work.reduce((s, b) => s + b.end - b.start, 0);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Your plan</h2>
        <span className="text-sm text-slate-500">
          {formatMinutes(doneMinutes || 0)} of {formatMinutes(totalMinutes)} done
          {isAdmin && (
            <button
              type="button"
              className="ml-3 text-red-600 hover:underline dark:text-red-400"
              disabled={pending}
              onClick={() => {
                if (confirm("Clear this plan? Tasks it created that aren't done are removed; your own tasks stay.")) startTransition(() => clearPlan(day));
              }}
            >
              Clear plan
            </button>
          )}
        </span>
      </div>
      {summary && <p className="mb-3 text-sm text-slate-500">💡 {summary}</p>}
      <Timeline
        blocks={blocks}
        nowMinutes={nowMinutes}
        status={status}
        onToggle={
          isAdmin
            ? (taskId, done) =>
                startTransition(async () => {
                  setStatus({ id: taskId, status: done ? "DONE" : "TODO" });
                  await setTaskStatus(taskId, done ? "DONE" : "TODO");
                })
            : undefined
        }
      />
    </Card>
  );
}

function Timeline({
  blocks,
  nowMinutes = null,
  status,
  onToggle,
}: {
  blocks: Block[];
  nowMinutes?: number | null;
  status?: Record<string, TaskStatus>;
  onToggle?: (taskId: string, done: boolean) => void;
}) {
  return (
    <ol className="flex flex-col">
      {blocks.map((b, i) => {
        const now = nowMinutes != null && nowMinutes >= b.start && nowMinutes < b.end;
        const done = Boolean(b.taskId && status?.[b.taskId] === "DONE");
        const rest = b.kind !== "work";
        return (
          <li
            key={i}
            aria-current={now ? "time" : undefined}
            className={`flex items-center gap-3 border-l-4 py-1.5 pl-3 ${now ? "bg-blue-500/10" : ""} ${rest ? "text-slate-500" : ""}`}
            style={{ borderLeftColor: rest ? "transparent" : (b.color ?? "#94a3b8") }}
          >
            <span className="w-[5.5rem] shrink-0 text-xs tabular-nums sm:w-24 sm:text-sm">
              {toHHMM(b.start)}–{toHHMM(b.end)}
            </span>
            {b.kind === "work" && status && b.taskId ? (
              <input
                type="checkbox"
                checked={done}
                disabled={!onToggle}
                aria-label={`Mark "${b.title}" as ${done ? "not done" : "done"}`}
                onChange={(e) => onToggle?.(b.taskId!, e.target.checked)}
                className="h-4 w-4 shrink-0 accent-blue-600"
              />
            ) : (
              rest && <span aria-hidden="true" className="w-4 shrink-0 text-center">{ICON[b.kind]}</span>
            )}
            {/* Phones: difficulty and length go under the title. */}
            <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
            <span className={`min-w-0 flex-1 ${b.kind === "work" ? "font-medium" : "text-sm"} ${done ? "text-slate-400 line-through" : ""}`}>
              {b.title}
              {now && <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Now</span>}
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {b.kind === "work" && b.difficulty ? `${DIFFICULTY_LABEL[b.difficulty]} · ` : ""}
              {formatMinutes(b.end - b.start)}
            </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SmallIcon({ label, disabled, danger = false, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`h-7 w-7 rounded-md text-sm disabled:opacity-30 ${danger ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
    >
      {children}
    </button>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      {text}
    </p>
  );
}
