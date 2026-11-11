"use client";

import { useRef, useState } from "react";
import { buttonClass } from "@/components/ui";

type Counts = Record<string, number>;
const LABELS: Record<string, string> = {
  projects: "Projects",
  learningPaths: "Learning paths",
  milestones: "Milestones",
  learningSteps: "Learning steps",
  recurringTasks: "Recurring tasks",
  tasks: "Tasks",
  timeLogs: "Time log entries",
};

// Download a backup, or restore one: check the file first, then confirm.
export function BackupSection() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [check, setCheck] = useState<{ exportedAt: string | null; counts: Counts; current: Counts; fixes: number } | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<"" | "check" | "restore">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Counts | null>(null);

  async function send(mode: "check" | "restore", f: File) {
    setBusy(mode);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", f);
      fd.set("mode", mode);
      const res = await fetch("/settings/backup/restore", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({ error: "The server's answer couldn't be read." }));
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong.");
        if (mode === "check") setCheck(null);
      } else if (mode === "check") {
        setCheck(data);
        setAgree(false);
      } else {
        setDone(data.counts);
        setCheck(null);
        setFile(null);
        if (input.current) input.current.value = "";
      }
    } catch {
      setError("Couldn't reach the app. Is it still running?");
    } finally {
      setBusy("");
    }
  }

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }) : "an unknown date";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-1 font-medium">Download a backup</h3>
        <p className="mb-3 text-sm text-slate-500">
          One file with all your projects, learning paths, milestones, steps, tasks, recurring tasks and time logs. Accounts and
          passwords are not included. Keep it somewhere safe, like a cloud drive.
        </p>
        <a href="/settings/backup" className={buttonClass.primary} download>
          ⬇ Download backup
        </a>
      </div>

      <hr className="border-slate-200 dark:border-slate-700" />

      <div>
        <h3 className="mb-1 font-medium">Restore from a backup</h3>
        <p className="mb-3 text-sm text-slate-500">
          Replaces <strong>all</strong> current data with the backup&apos;s. Your accounts stay as they are. Download a backup of
          what you have now first, just in case.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={buttonClass.secondary} disabled={busy !== ""} onClick={() => input.current?.click()}>
            {file ? "Choose another file" : "Choose a backup file"}
          </button>
          {file && <span className="text-sm text-slate-600 dark:text-slate-300">{file.name}</span>}
          {busy === "check" && <span className="text-sm text-slate-500">Checking…</span>}
        </div>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          aria-label="Backup file"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setCheck(null);
            setDone(null);
            if (f) send("check", f);
          }}
        />

        {error && (
          <p role="alert" className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {check && file && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="mb-3 text-sm">
              Backup from <strong>{fmtDate(check.exportedAt)}</strong>. Restoring replaces what you have now:
            </p>
            <table className="mb-3 w-full max-w-md text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-1 font-medium"></th>
                  <th className="py-1 text-right font-medium">Now</th>
                  <th className="py-1 text-right font-medium">After restore</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(LABELS).map((k) => (
                  <tr key={k} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-1">{LABELS[k]}</td>
                    <td className="py-1 text-right tabular-nums text-slate-500">{check.current[k] ?? 0}</td>
                    <td className="py-1 text-right font-medium tabular-nums">{check.counts[k] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {check.fixes > 0 && (
              <p className="mb-3 text-xs text-slate-500">
                {check.fixes} broken link{check.fixes === 1 ? "" : "s"} in the file will be cleared (for example, a task pointing at a
                project that isn&apos;t in the backup).
              </p>
            )}
            <label className="mb-3 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" />
              <span>I understand this replaces all my current data with this backup.</span>
            </label>
            <button
              type="button"
              disabled={!agree || busy !== ""}
              className={buttonClass.danger}
              onClick={() => send("restore", file)}
            >
              {busy === "restore" ? "Restoring…" : "Replace my data with this backup"}
            </button>
          </div>
        )}

        {done && (
          <p role="status" className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
            Restored: {done.projects} projects, {done.learningPaths} learning paths, {done.learningSteps} steps, {done.tasks} tasks
            and {done.timeLogs} time log entries.
          </p>
        )}
      </div>
    </div>
  );
}
