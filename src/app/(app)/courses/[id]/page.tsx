import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { buttonClass, Card, PageHeader } from "@/components/ui";
import { CourseChecklist, DeleteCourseButton } from "./checklist";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { added } = await searchParams;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      items: { orderBy: { order: "asc" } },
      steps: {
        orderBy: [{ learningPathId: "asc" }, { order: "asc" }],
        include: { learningPath: { select: { id: true, title: true, color: true } }, milestone: { select: { title: true } } },
      },
      achievement: true,
    },
  });
  if (!course) notFound();
  const isAdmin = user.role === "ADMIN";

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/courses", label: "Courses" }}
        title={<>🎓 {course.title}</>}
        actions={
          isAdmin && (
            <>
              <Link href={`/courses/${id}/edit`} className={buttonClass.secondary}>
                Edit
              </Link>
              <DeleteCourseButton courseId={id} title={course.title} />
            </>
          )
        }
      />
      <div className="-mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
        {course.provider && <span>{course.provider}</span>}
        {course.url && (
          <a href={course.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Open course ↗
          </a>
        )}
        {course.completedAt && <span className="text-emerald-700 dark:text-emerald-400">🏆 Completed {course.completedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>}
      </div>

      {added && course.items.length === 0 && (
        <p className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-900 dark:text-blue-100">
          Added to your courses and linked to the level. Now paste the course content below (copy the curriculum from the course page) to get a checklist.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Course content</h2>
          <CourseChecklist
            key={course.items.map((i) => i.id).join()}
            courseId={id}
            items={course.items.map((i) => ({ id: i.id, title: i.title, heading: i.heading, done: i.done }))}
            isAdmin={isAdmin}
            completed={Boolean(course.completedAt)}
          />
        </Card>
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">In your learning paths</h2>
            {course.steps.length === 0 ? (
              <p className="text-sm text-slate-500">
                Not linked to a learning level yet.{" "}
                {isAdmin && (
                  <Link href={`/courses/${id}/edit`} className="text-blue-600 underline dark:text-blue-400">
                    Link levels
                  </Link>
                )}
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {course.steps.map((s) => (
                  <li key={s.id} className="flex items-start gap-2">
                    <span aria-hidden="true" className={s.done ? "text-emerald-600" : "text-slate-400"}>
                      {s.done ? "✓" : "○"}
                    </span>
                    <span>
                      <Link href={`/learning/${s.learningPath.id}`} className="font-medium hover:underline">
                        {s.title}
                      </Link>
                      <span className="block text-xs text-slate-500">
                        <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.learningPath.color }} />
                        {s.learningPath.title}
                        {s.milestone ? ` · ${s.milestone.title}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">These levels are ticked automatically when you finish the course.</p>
          </Card>
          {course.notes && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h2>
              <p className="whitespace-pre-wrap text-sm">{course.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
