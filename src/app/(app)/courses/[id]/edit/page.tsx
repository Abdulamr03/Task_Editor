import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { getLevelChoices } from "@/lib/course-levels";
import { CourseForm } from "../../course-form";
import { updateCourse } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [course, levels] = await Promise.all([
    db.course.findUnique({ where: { id }, include: { steps: { select: { id: true } } } }),
    getLevelChoices(),
  ]);
  if (!course) notFound();
  return (
    <main className="max-w-2xl">
      <PageHeader title={`Edit ${course.title}`} back={{ href: `/courses/${id}`, label: course.title }} />
      <Card>
        <CourseForm
          action={updateCourse.bind(null, id)}
          initial={{ title: course.title, url: course.url ?? "", provider: course.provider ?? "", notes: course.notes ?? "" }}
          initialSteps={course.steps.map((s) => s.id)}
          levels={levels}
          courseId={id}
          showContent={false}
          cancelHref={`/courses/${id}`}
        />
      </Card>
    </main>
  );
}
