import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { courseProgress } from "@/lib/courses";
import { buttonClass, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const user = await requireUser();
  const courses = await db.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: { select: { heading: true, done: true } },
      steps: { select: { id: true, learningPath: { select: { title: true } } } },
    },
  });
  const rows = courses.map((c) => ({ ...c, progress: courseProgress(c.items) }));
  const studying = rows.filter((c) => !c.completedAt);
  const finished = rows.filter((c) => c.completedAt).sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());

  return (
    <main>
      <PageHeader
        title="Courses"
        actions={
          user.role === "ADMIN" && (
            <Link href="/courses/new" className={buttonClass.primary}>
              + New course
            </Link>
          )
        }
      />
      {rows.length === 0 ? (
        <EmptyState>
          No courses yet. Add the course you&apos;re studying — its link and its content as a checklist — and link it to levels of your
          learning paths. You can also add one from a level&apos;s 📚 Study resources.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          {studying.length > 0 && <CourseGrid title="Studying" courses={studying} />}
          {finished.length > 0 && <CourseGrid title="Completed" courses={finished} />}
        </div>
      )}
    </main>
  );
}

function CourseGrid({
  title,
  courses,
}: {
  title: string;
  courses: {
    id: string;
    title: string;
    provider: string | null;
    completedAt: Date | null;
    progress: { done: number; total: number };
    steps: { id: string; learningPath: { title: string } }[];
  }[];
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} · {courses.length}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {courses.map((c) => {
          const paths = [...new Set(c.steps.map((s) => s.learningPath.title))];
          return (
            <Link key={c.id} href={`/courses/${c.id}`} className="block">
              <Card className="h-full transition hover:border-blue-400">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="font-semibold">🎓 {c.title}</h3>
                  {c.completedAt && <span className="shrink-0 text-sm" title="Completed">🏆</span>}
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  {[c.provider, paths.length ? `for ${paths.join(", ")}` : null, c.completedAt ? `finished ${formatDay(c.completedAt)}` : null]
                    .filter(Boolean)
                    .join(" · ") || " "}
                </p>
                <ProgressBar done={c.progress.done} total={c.progress.total} color={c.completedAt ? "#10b981" : "#0ea5e9"} unit="lessons" />
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
