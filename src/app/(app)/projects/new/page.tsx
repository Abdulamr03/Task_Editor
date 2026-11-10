import { requireAdmin } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { PROJECT_COLORS } from "@/lib/projects";
import { toDateInput, today } from "@/lib/dates";
import { ProjectForm } from "../project-form";
import { createProject } from "../actions";

export default async function NewProjectPage() {
  await requireAdmin();

  return (
    <main className="max-w-2xl">
      <PageHeader title="New project" back={{ href: "/projects", label: "Projects" }} />
      <Card>
        <ProjectForm
          action={createProject}
          submitLabel="Create project"
          cancelHref="/projects"
          initial={{
            name: "",
            description: "",
            status: "ACTIVE",
            color: PROJECT_COLORS[0],
            startDate: toDateInput(today()),
            dueDate: "",
            notes: "",
          }}
        />
      </Card>
    </main>
  );
}
