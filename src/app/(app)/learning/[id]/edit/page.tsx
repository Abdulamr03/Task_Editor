import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { ItemForm } from "@/components/item-form";
import { updateLearningPath } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditLearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const path = await db.learningPath.findUnique({ where: { id } });
  if (!path) notFound();

  return (
    <main className="max-w-2xl">
      <PageHeader title={`Edit ${path.title}`} back={{ href: `/learning/${id}`, label: path.title }} />
      <Card>
        <ItemForm
          action={updateLearningPath.bind(null, id)}
          submitLabel="Save changes"
          cancelHref={`/learning/${id}`}
          descriptionHint="What you're learning, e.g. a course, a book or a topic."
          initial={{
            name: path.title,
            description: path.description ?? "",
            status: path.status,
            color: path.color,
            notes: path.notes ?? "",
          }}
        />
      </Card>
    </main>
  );
}
