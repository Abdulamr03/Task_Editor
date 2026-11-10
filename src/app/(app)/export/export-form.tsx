"use client";

import { useRef, useState } from "react";
import { buttonClass, Card, inputClass } from "@/components/ui";

type Choice = { id: string; label: string; color: string; note: string };
type Section = { key: string; label: string; hint: string };

// Picks the date range, what to include, and downloads (or previews) the PDF.
export function ExportForm({
  projects,
  paths,
  sections,
  presets,
}: {
  projects: Choice[];
  paths: Choice[];
  sections: Section[];
  presets: { label: string; from: string; to: string }[];
}) {
  const form = useRef<HTMLFormElement>(null);
  const [from, setFrom] = useState(presets[0].from);
  const [to, setTo] = useState(presets[0].to);
  const [error, setError] = useState("");

  // Builds the PDF link from the form, or explains what's missing.
  function pdfUrl(view: boolean): string | null {
    const data = new FormData(form.current!);
    if (!from || !to) return fail("Choose a start and end date.");
    if (to < from) return fail("The end date can't be before the start date.");
    if (!data.getAll("section").length) return fail("Choose at least one section to include.");
    if (!data.getAll("project").length && !data.getAll("path").length && !data.get("unlinked")) {
      return fail("Choose at least one project, learning path or “Other tasks”.");
    }
    setError("");
    const params = new URLSearchParams(data as unknown as Record<string, string>);
    if (view) params.set("view", "1");
    return `/export/pdf?${params.toString()}`;
  }
  function fail(message: string) {
    setError(message);
    return null;
  }

  return (
    <form ref={form} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
      <Card>
        <h2 className="mb-3 font-semibold">1. Dates</h2>
        <div className="mb-3 flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setFrom(p.from);
                setTo(p.to);
              }}
              aria-pressed={from === p.from && to === p.to}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 aria-pressed:border-slate-900 aria-pressed:bg-slate-900 aria-pressed:text-white dark:border-slate-600 dark:hover:bg-slate-800 dark:aria-pressed:border-slate-100 dark:aria-pressed:bg-slate-100 dark:aria-pressed:text-slate-900"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid max-w-md grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            From
            <input type="date" name="from" value={from} onChange={(e) => setFrom(e.target.value)} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            To
            <input type="date" name="to" value={to} onChange={(e) => setTo(e.target.value)} required className={inputClass} />
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">2. What to include</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <ChoiceGroup title="Projects" name="project" choices={projects} empty="No projects yet." />
          <ChoiceGroup title="Learning paths" name="path" choices={paths} empty="No learning paths yet." />
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" name="unlinked" value="1" defaultChecked className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-medium">Other tasks</span>
            <span className="block text-slate-500">Tasks not linked to a project or learning path</span>
          </span>
        </label>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">3. Sections</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {sections.map((sec) => (
            <label key={sec.key} className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="section" value={sec.key} defaultChecked className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium">{sec.label}</span>
                <span className="block text-slate-500">{sec.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass.primary}
          onClick={() => {
            const url = pdfUrl(false);
            if (url) window.location.href = url;
          }}
        >
          Download PDF
        </button>
        <button
          type="button"
          className={buttonClass.secondary}
          onClick={() => {
            const url = pdfUrl(true);
            if (url) window.open(url, "_blank", "noopener");
          }}
        >
          Preview in a new tab
        </button>
      </div>
    </form>
  );
}

function ChoiceGroup({ title, name, choices, empty }: { title: string; name: string; choices: Choice[]; empty: string }) {
  const group = useRef<HTMLFieldSetElement>(null);
  const setAll = (on: boolean) =>
    group.current?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((i) => (i.checked = on));

  return (
    <fieldset ref={group}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <legend className="text-sm font-semibold">{title}</legend>
        {choices.length > 1 && (
          <span className="flex gap-2 text-xs">
            <button type="button" onClick={() => setAll(true)} className="text-blue-600 hover:underline dark:text-blue-400">
              All
            </button>
            <button type="button" onClick={() => setAll(false)} className="text-blue-600 hover:underline dark:text-blue-400">
              None
            </button>
          </span>
        )}
      </div>
      {choices.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {choices.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={name} value={c.id} defaultChecked={c.note !== "Archived"} className="h-4 w-4 shrink-0" />
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="truncate">{c.label}</span>
                {c.note !== "Active" && <span className="text-xs text-slate-400">{c.note}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
