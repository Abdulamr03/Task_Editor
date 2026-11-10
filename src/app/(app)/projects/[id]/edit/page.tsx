import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toDateInput } from "@/lib/dates";
import { Card, PageHeader } from "@/components/ui";
import { ItemForm } from "@/components/item-form";
import { updateProject } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <main className="max-w-2xl">
      <PageHeader title={`Edit ${project.name}`} back={{ href: `/projects/${id}`, label: project.name }} />
      <Card>
        <ItemForm withDates descriptionHint="One or two lines about the project."
          action={updateProject.bind(null, id)}
          submitLabel="Save changes"
          cancelHref={`/projects/${id}`}
          initial={{
            name: project.name,
            description: project.description ?? "",
            status: project.status,
            color: project.color,
            startDate: toDateInput(project.startDate),
            dueDate: toDateInput(project.dueDate),
            notes: project.notes ?? "",
          }}
        />
      </Card>
    </main>
  );
}
