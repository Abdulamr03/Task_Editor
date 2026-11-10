import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { PROJECT_COLORS } from "@/lib/projects";
import { ItemForm } from "@/components/item-form";
import { createLearningPath } from "../actions";

export default async function NewLearningPathPage() {
  await requireAdmin();

  return (
    <main className="max-w-2xl">
      <PageHeader title="New learning path" back={{ href: "/learning", label: "Learning paths" }} />
      <Card>
        <ItemForm
          action={createLearningPath}
          submitLabel="Create learning path"
          cancelHref="/learning"
          descriptionHint="What you're learning, e.g. a course, a book or a topic. You add the steps next."
          initial={{ name: "", description: "", status: "ACTIVE", color: PROJECT_COLORS[1], notes: "" }}
        />
      </Card>
    </main>
  );
}
