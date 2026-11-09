import Link from "next/link";
import type { Prisma, ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectProgress } from "@/lib/project-progress";
import { buttonClass, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { DueLabel } from "@/components/due-label";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; where: Prisma.ProjectWhereInput }[] = [
  { key: "current", label: "Current", where: { status: { not: "ARCHIVED" } } },
  { key: "active", label: "Active", where: { status: "ACTIVE" } },
  { key: "paused", label: "Paused", where: { status: "PAUSED" } },
  { key: "done", label: "Done", where: { status: "DONE" } },
  { key: "archived", label: "Archived", where: { status: "ARCHIVED" } },
];

const STATUS_ORDER: Record<ProjectStatus, number> = { ACTIVE: 0, PAUSED: 1, DONE: 2, ARCHIVED: 3 };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser();
  const { show } = await searchParams;
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0];

  const projects = await db.project.findMany({
    where: filter.where,
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
  });
  projects.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const progress = await getProjectProgress(projects.map((p) => p.id));

  return (
    <main>
      <PageHeader
        title="Projects"
        actions={
          user.role === "ADMIN" && (
            <Link href="/projects/new" className={buttonClass.primary}>
              + New project
            </Link>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-1" role="tablist" aria-label="Filter projects">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "current" ? "/projects" : `/projects?show=${f.key}`}
            role="tab"
            aria-selected={f.key === filter.key}
            className={`rounded-full px-3 py-1 text-sm ${
              f.key === filter.key
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <EmptyState>
          {filter.key === "current" ? (
            <>
              <p className="mb-3">No projects yet.</p>
              {user.role === "ADMIN" && (
                <Link href="/projects/new" className={buttonClass.primary}>
                  Create your first project
                </Link>
              )}
            </>
          ) : (
            <p>No {filter.label.toLowerCase()} projects.</p>
          )}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const prog = progress.get(p.id) ?? { done: 0, total: 0 };
            return (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-blue-500">
                  <Card className="flex h-full flex-col gap-3 transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </h2>
                      <StatusBadge status={p.status} />
                    </div>
                    {p.description && <p className="line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                    <div className="mt-auto flex flex-col gap-3">
                      {p.dueDate && <DueLabel date={p.dueDate} done={p.status === "DONE" || p.status === "ARCHIVED"} />}
                      <ProgressBar done={prog.done} total={prog.total} color={p.color} />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
