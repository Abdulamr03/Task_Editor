import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, PageHeader, ProgressBar } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { ItemActionsBar } from "@/components/item-actions-bar";
import { deleteLearningPath, setLearningPathStatus } from "../actions";
import { StepList } from "./steps";
import { LinkedTasks } from "@/components/linked-tasks";
import { TimeSpent } from "@/components/time-spent";
import { getTimeTotals } from "@/lib/time-stats";

export const dynamic = "force-dynamic";

export default async function LearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const path = await db.learningPath.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { order: "asc" } },
      steps: {
        orderBy: { order: "asc" },
        include: { coveredBy: { select: { title: true, learningPath: { select: { id: true, title: true } } } } },
      },
    },
  });
  if (!path) notFound();
  const time = await getTimeTotals({ learningPathId: id });

  const done = path.steps.filter((s) => s.done).length;
  const isAdmin = user.role === "ADMIN";

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/learning", label: "Learning paths" }}
        title={
          <>
            <span className="mr-3 inline-block h-3.5 w-3.5 rounded-full align-middle" style={{ backgroundColor: path.color }} />
            <span className="align-middle">{path.title}</span>
            <span className="ml-3 inline-block align-middle text-base font-normal">
              <StatusBadge status={path.status} />
            </span>
          </>
        }
        actions={
          isAdmin && (
            <ItemActionsBar
              editHref={`/learning/${id}/edit`}
              name={path.title}
              status={path.status}
              setStatus={setLearningPathStatus.bind(null, id)}
              remove={deleteLearningPath.bind(null, id)}
              deleteWarning="All its steps are deleted too. Linked tasks are kept."
            />
          )
        }
      />

      {path.description && <p className="-mt-4 text-slate-500">{path.description}</p>}

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Progress</h2>
        <ProgressBar done={done} total={path.steps.length} color={path.color} unit="steps" />
      </Card>

      <TimeSpent total={time.total} week={time.week} color={path.color} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">{path.milestones.length ? "Milestones" : "Steps"}</h2>
        <StepList
          pathId={path.id}
          isAdmin={isAdmin}
          color={path.color}
          milestones={path.milestones.map((m) => ({ id: m.id, title: m.title, description: m.description }))}
          steps={path.steps.map((s) => ({
            id: s.id,
            title: s.title,
            done: s.done,
            doneAt: s.doneAt?.toISOString() ?? null,
            resourceUrl: s.resourceUrl,
            notes: s.notes,
            milestoneId: s.milestoneId,
            estimateMinutes: s.estimateMinutes,
            difficulty: s.difficulty,
            pages: s.pages,
            coveredBy: s.coveredBy
              ? { title: s.coveredBy.title, pathId: s.coveredBy.learningPath.id, pathTitle: s.coveredBy.learningPath.title }
              : null,
          }))}
        />
      </section>

      <LinkedTasks where={{ learningPathId: id }} isAdmin={isAdmin} />

      {path.notes && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{path.notes}</p>
        </Card>
      )}
    </main>
  );
}
