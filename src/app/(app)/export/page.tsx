import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toDateInput, today } from "@/lib/dates";
import { addDaysUTC, mondayOf } from "@/lib/time-stats";
import { statusLabel } from "@/lib/projects";
import { SECTIONS } from "@/lib/report/data";
import { PageHeader } from "@/components/ui";
import { ExportForm } from "./export-form";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireUser();
  const [projects, paths] = await Promise.all([
    db.project.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }] }),
    db.learningPath.findMany({ orderBy: [{ status: "asc" }, { title: "asc" }] }),
  ]);

  const t = today();
  const monday = mondayOf(t);
  const firstOfMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
  const firstOfLastMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1));
  const d = toDateInput;
  const presets = [
    { label: "This week", from: d(monday), to: d(addDaysUTC(monday, 6)) },
    { label: "Last week", from: d(addDaysUTC(monday, -7)), to: d(addDaysUTC(monday, -1)) },
    { label: "This month", from: d(firstOfMonth), to: d(addDaysUTC(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1)), -1)) },
    { label: "Last month", from: d(firstOfLastMonth), to: d(addDaysUTC(firstOfMonth, -1)) },
    { label: "Last 30 days", from: d(addDaysUTC(t, -29)), to: d(t) },
    { label: "Today", from: d(t), to: d(t) },
  ];

  return (
    <main className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Export PDF" />
      <p className="-mt-4 text-slate-500">Make a PDF report of your tasks, progress and time for any period.</p>
      <ExportForm
        presets={presets}
        sections={SECTIONS.map((x) => ({ key: x.key, label: x.label, hint: x.hint }))}
        projects={projects.map((p) => ({ id: p.id, label: p.name, color: p.color, note: statusLabel(p.status) }))}
        paths={paths.map((p) => ({ id: p.id, label: p.title, color: p.color, note: statusLabel(p.status) }))}
      />
    </main>
  );
}
