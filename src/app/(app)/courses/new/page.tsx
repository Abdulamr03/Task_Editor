import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { getLevelChoices } from "@/lib/course-levels";
import { CourseForm } from "../course-form";
import { createCourse } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  await requireAdmin();
  const { step } = await searchParams;
  const levels = await getLevelChoices();
  return (
    <main className="max-w-2xl">
      <PageHeader title="New course" back={{ href: "/courses", label: "Courses" }} />
      <Card>
        <CourseForm
          action={createCourse}
          initial={{ title: "", url: "", provider: "", notes: "" }}
          initialSteps={step ? [step] : []}
          levels={levels}
          showContent
          cancelHref="/courses"
        />
      </Card>
    </main>
  );
}
