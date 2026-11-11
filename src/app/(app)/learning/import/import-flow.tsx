"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass, Card, inputClass } from "@/components/ui";
import { PROJECT_COLORS } from "@/lib/projects";
import { DIFFICULTY_LABEL, formatMinutes } from "@/lib/tasks";
import type { Plan } from "@/lib/ai/pdf-plan";
import { createPathFromPlan, type SavePlan } from "./actions";

type Covering = Record<string, { title: string; path: string; milestone: string | null }>;
type Level = SavePlan["milestones"][number]["levels"][number] & { key: number; coveredReason: string | null };
type Milestone = { key: number; title: string; description: string | null; levels: Level[] };

let nextKey = 1;

// Step 1: choose a PDF. Step 2: review and edit the proposed plan. Step 3: save.
export function ImportFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ plan: Plan; covering: Covering; fileName: string } | null>(null);

  useEffect(() => {
    if (!busy) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function analyze() {
    if (!file) return setError("Choose a PDF file first.");
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("hint", hint);
      const res = await fetch("/learning/import/analyze", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({ error: "The server's answer couldn't be read." }));
      if (!res.ok || data.error) setError(data.error ?? "Something went wrong.");
      else setResult(data);
    } catch {
      setError("Couldn't reach the app. Is it still running?");
    } finally {
      setBusy(false);
    }
  }

  if (result) return <Review {...result} onBack={() => setResult(null)} />;

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <DropZone file={file} onFile={setFile} disabled={busy} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Note for Claude (optional)
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            maxLength={500}
            disabled={busy}
            placeholder="e.g. only chapters 3–8 · I'm a beginner · split into weekly milestones"
            className={inputClass}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={analyze} disabled={busy || !file} className={buttonClass.primary}>
            {busy ? "Reading…" : "Read PDF and propose a plan"}
          </button>
          {busy && (
            <span role="status" className="text-sm text-slate-500">
              Claude is reading your PDF… {seconds}s (usually 30 seconds to 2 minutes)
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function DropZone({ file, onFile, disabled }: { file: File | null; onFile: (f: File | null) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f && !disabled) onFile(f);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center ${
        over ? "border-blue-500 bg-blue-500/5" : "border-slate-300 dark:border-slate-600"
      }`}
    >
      <span aria-hidden="true" className="text-3xl">
        📄
      </span>
      {file ? (
        <p className="text-sm">
          <span className="font-medium">{file.name}</span>{" "}
          <span className="text-slate-500">· {(file.size / 1024 / 1024).toFixed(1)} MB</span>
        </p>
      ) : (
        <p className="text-sm text-slate-500">Drag a PDF here, or</p>
      )}
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} className={buttonClass.secondary}>
        {file ? "Choose another file" : "Choose a PDF"}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label="PDF file"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <p className="text-xs text-slate-400">Up to 24 MB and 600 pages. Not password-protected.</p>
    </div>
  );
}

function Review({ plan, covering, fileName, onBack }: { plan: Plan; covering: Covering; fileName: string; onBack: () => void }) {
  const [title, setTitle] = useState(plan.title);
  const [description, setDescription] = useState(plan.description ?? "");
  const [color, setColor] = useState(PROJECT_COLORS[1]);
  const [milestones, setMilestones] = useState<Milestone[]>(() =>
    plan.milestones.map((m) => ({
      key: nextKey++,
      title: m.title,
      description: m.description,
      // Covered levels are ticked by default; untick to do them again.
      levels: m.levels.map((l) => ({ ...l, key: nextKey++, markDone: Boolean(l.coveredBy) })),
    })),
  );
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const levels = milestones.flatMap((m) => m.levels);
  const covered = levels.filter((l) => l.coveredBy).length;
  const ticked = levels.filter((l) => l.coveredBy && l.markDone).length;
  const minutes = levels.reduce((s, l) => s + (l.coveredBy && l.markDone ? 0 : (l.estimateMinutes ?? 0)), 0);

  const updateMilestone = (key: number, change: Partial<Milestone>) =>
    setMilestones((ms) => ms.map((m) => (m.key === key ? { ...m, ...change } : m)));
  const updateLevel = (mKey: number, lKey: number, change: Partial<Level>) =>
    setMilestones((ms) =>
      ms.map((m) => (m.key === mKey ? { ...m, levels: m.levels.map((l) => (l.key === lKey ? { ...l, ...change } : l)) } : m)),
    );
  const removeLevel = (mKey: number, lKey: number) =>
    setMilestones((ms) => ms.map((m) => (m.key === mKey ? { ...m, levels: m.levels.filter((l) => l.key !== lKey) } : m)).filter((m) => m.levels.length));
  const moveMilestone = (key: number, dir: -1 | 1) =>
    setMilestones((ms) => {
      const i = ms.findIndex((m) => m.key === key);
      const j = i + dir;
      if (j < 0 || j >= ms.length) return ms;
      const copy = [...ms];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  function save() {
    setError("");
    startTransition(async () => {
      const res = await createPathFromPlan({
        title,
        description: description || null,
        color,
        fileName,
        milestones: milestones.map((m) => ({
          title: m.title,
          description: m.description,
          levels: m.levels.map(({ title, notes, estimateMinutes, difficulty, pages, coveredBy, markDone }) => ({ title, notes, estimateMinutes, difficulty, pages, coveredBy, markDone })),
        })),
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <p className="mb-3 text-sm text-slate-500">
          Proposed from <span className="font-medium text-slate-700 dark:text-slate-200">{fileName}</span>:{" "}
          {milestones.length} milestones · {levels.length} levels
          {minutes ? ` · about ${formatMinutes(minutes)} of study` : ""}
          {covered > 0 && ` · ${covered} already covered (${ticked} ticked)`}
        </p>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Learning path name
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={inputClass} />
          </label>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Colour</legend>
            <div className="flex gap-1.5 pt-1">
              {PROJECT_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full ring-offset-2 ring-offset-white aria-pressed:ring-2 aria-pressed:ring-slate-900 dark:ring-offset-slate-900 dark:aria-pressed:ring-slate-100"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>
        </div>
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
        </label>
      </Card>

      <ol className="flex flex-col gap-4">
        {milestones.map((m, mi) => (
          <li key={m.key}>
            <Card padded={false} className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: color }}>
                  {mi + 1}
                </span>
                <input
                  aria-label={`Milestone ${mi + 1} name`}
                  value={m.title}
                  onChange={(e) => updateMilestone(m.key, { title: e.target.value })}
                  className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 dark:focus:bg-slate-800"
                />
                <IconButton label="Move milestone up" disabled={mi === 0} onClick={() => moveMilestone(m.key, -1)}>↑</IconButton>
                <IconButton label="Move milestone down" disabled={mi === milestones.length - 1} onClick={() => moveMilestone(m.key, 1)}>↓</IconButton>
                <IconButton label="Remove milestone" danger onClick={() => setMilestones((ms) => ms.filter((x) => x.key !== m.key))}>✕</IconButton>
              </div>
              {m.description && <p className="px-4 pt-3 text-sm text-slate-500">{m.description}</p>}
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {m.levels.map((l) => {
                  const by = l.coveredBy ? covering[l.coveredBy] : null;
                  return (
                    <li key={l.key} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <input
                          aria-label="Level name"
                          value={l.title}
                          onChange={(e) => updateLevel(m.key, l.key, { title: e.target.value })}
                          className={`w-full rounded bg-transparent px-1 py-0.5 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 dark:focus:bg-slate-800 ${
                            by && l.markDone ? "text-slate-400 line-through" : ""
                          }`}
                        />
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-xs text-slate-500">
                          {l.estimateMinutes && <span>⏱ {formatMinutes(l.estimateMinutes)}</span>}
                          {l.difficulty && <span>{DIFFICULTY_LABEL[l.difficulty]}</span>}
                          {l.pages && <span>📖 {l.pages}</span>}
                        </div>
                        {l.notes && <p className="mt-1 px-1 text-sm text-slate-500">{l.notes}</p>}
                        {by && (
                          <label className="mt-2 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={l.markDone}
                              onChange={(e) => updateLevel(m.key, l.key, { markDone: e.target.checked })}
                              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600"
                            />
                            <span>
                              <span className="font-medium text-emerald-800 dark:text-emerald-300">Already covered — mark as done</span>
                              <span className="block text-xs text-slate-600 dark:text-slate-300">
                                by “{by.title}” in {by.path}
                                {by.milestone ? ` › ${by.milestone}` : ""}
                                {l.coveredReason ? ` — ${l.coveredReason}` : ""}
                              </span>
                            </span>
                          </label>
                        )}
                      </div>
                      <IconButton label="Remove level" danger onClick={() => removeLevel(m.key, l.key)}>✕</IconButton>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-slate-200 bg-[var(--background)] px-4 py-3 dark:border-slate-700">
        <button type="button" onClick={save} disabled={pending || !title.trim() || milestones.length === 0} className={buttonClass.primary}>
          {pending ? "Creating…" : "Create learning path"}
        </button>
        <button type="button" onClick={onBack} disabled={pending} className={buttonClass.secondary}>
          Start over
        </button>
      </div>
    </div>
  );
}

function IconButton({ label, disabled, danger = false, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm disabled:opacity-30 ${
        danger ? "text-red-600 hover:bg-red-500/10 dark:text-red-400" : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
