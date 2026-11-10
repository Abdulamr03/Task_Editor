import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getProjectProgress } from "@/lib/project-progress";
import { Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { dueNote } from "@/components/due-label";
import { ItemActionsBar } from "@/components/item-actions-bar";
import { deleteProject, setProjectStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) notFound();

  const progress = (await getProjectProgress([id])).get(id) ?? { done: 0, total: 0 };
  const finished = project.status === "DONE" || project.status === "ARCHIVED";

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/projects", label: "Projects" }}
        title={
          <>
            <span className="mr-3 inline-block h-3.5 w-3.5 rounded-full align-middle" style={{ backgroundColor: project.color }} />
            <span className="align-middle">{project.name}</span>
            <span className="ml-3 inline-block align-middle text-base font-normal">
              <StatusBadge status={project.status} />
            </span>
          </>
        }
        actions={
          user.role === "ADMIN" && (
            <ItemActionsBar
              editHref={`/projects/${id}/edit`}
              name={project.name}
              status={project.status}
              setStatus={setProjectStatus.bind(null, id)}
              remove={deleteProject.bind(null, id)}
              deleteWarning="Its tasks are kept but no longer linked to a project."
            />
          )
        }
      />

      {project.description && <p className="-mt-4 text-slate-500">{project.description}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Progress</h2>
          <ProgressBar done={progress.done} total={progress.total} color={project.color} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Dates</h2>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Start</dt>
              <dd>{project.startDate ? formatDate(project.startDate) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Due</dt>
              <dd className={project.dueDate ? dueNote(project.dueDate, finished).tone : ""}>{project.dueDate ? formatDate(project.dueDate) : "—"}</dd>
            </div>
          </dl>
          {project.dueDate && dueNote(project.dueDate, finished).note && (
            <p className={`mt-1 text-right text-sm ${dueNote(project.dueDate, finished).tone}`}>
              {dueNote(project.dueDate, finished).note}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h2>
        {project.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{project.notes}</p>
        ) : (
          <p className="text-sm text-slate-500">No notes yet.</p>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
        <EmptyState>Tasks for this project will appear here once the Tasks feature is added.</EmptyState>
      </section>
    </main>
  );
}
