import Link from "next/link";
import type { Prisma, ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getLearningProgress } from "@/lib/learning-progress";
import { buttonClass, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; where: Prisma.LearningPathWhereInput }[] = [
  { key: "current", label: "Current", where: { status: { not: "ARCHIVED" } } },
  { key: "active", label: "Active", where: { status: "ACTIVE" } },
  { key: "paused", label: "Paused", where: { status: "PAUSED" } },
  { key: "done", label: "Done", where: { status: "DONE" } },
  { key: "archived", label: "Archived", where: { status: "ARCHIVED" } },
];

const STATUS_ORDER: Record<ProjectStatus, number> = { ACTIVE: 0, PAUSED: 1, DONE: 2, ARCHIVED: 3 };

export default async function LearningPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const user = await requireUser();
  const { show } = await searchParams;
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0];

  const paths = await db.learningPath.findMany({
    where: filter.where,
    orderBy: { createdAt: "desc" },
    include: {
      // The next step still to do, shown on the card.
      steps: {
        where: { done: false },
        orderBy: [{ milestone: { order: "asc" } }, { order: "asc" }],
        take: 1,
        select: { title: true },
      },
    },
  });
  paths.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const progress = await getLearningProgress(paths.map((p) => p.id));

  return (
    <main>
      <PageHeader
        title="Learning paths"
        actions={
          user.role === "ADMIN" && (
            <>
              <Link href="/learning/import" className={buttonClass.secondary}>
                📄 Import from PDF
              </Link>
              <Link href="/learning/new" className={buttonClass.primary}>
                + New learning path
              </Link>
            </>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-1" role="tablist" aria-label="Filter learning paths">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "current" ? "/learning" : `/learning?show=${f.key}`}
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

      {paths.length === 0 ? (
        <EmptyState>
          {filter.key === "current" ? (
            <>
              <p className="mb-1">No learning paths yet.</p>
              <p className="mb-3 text-sm">A learning path is a course, book or topic split into steps you tick off.</p>
              {user.role === "ADMIN" && (
                <Link href="/learning/new" className={buttonClass.primary}>
                  Create your first learning path
                </Link>
              )}
            </>
          ) : (
            <p>No {filter.label.toLowerCase()} learning paths.</p>
          )}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {paths.map((p) => {
            const prog = progress.get(p.id) ?? { done: 0, total: 0 };
            const next = p.steps[0]?.title;
            return (
              <li key={p.id}>
                <Link href={`/learning/${p.id}`} className="block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-blue-500">
                  <Card className="flex h-full flex-col gap-3 transition hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.title}
                      </h2>
                      <StatusBadge status={p.status} />
                    </div>
                    {p.description && <p className="line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                    <div className="mt-auto flex flex-col gap-3">
                      {next ? (
                        <p className="truncate text-sm">
                          <span className="text-slate-500">Next: </span>
                          {next}
                        </p>
                      ) : (
                        prog.total > 0 && <p className="text-sm text-emerald-600 dark:text-emerald-400">All steps done 🎉</p>
                      )}
                      <ProgressBar done={prog.done} total={prog.total} color={p.color} unit="steps" />
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
