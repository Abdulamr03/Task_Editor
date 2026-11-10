"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDateInput } from "@/lib/dates";
import { isProjectStatus } from "@/lib/projects";
import type { ItemFormState as ProjectFormState } from "@/components/item-form";


const FIELDS = ["name", "description", "status", "color", "startDate", "dueDate", "notes"] as const;

// Reads and checks the project form. Returns the data to save, or an error
// message plus what was typed so the form can show it again.
function readForm(formData: FormData) {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const fail = (error: string) => ({ ok: false as const, state: { error, values } });

  if (!values.name) return fail("Enter a project name.");
  if (values.name.length > 100) return fail("The name can be at most 100 characters.");
  if (!isProjectStatus(values.status)) return fail("Choose a status.");
  if (!/^#[0-9a-fA-F]{6}$/.test(values.color)) return fail("Choose a colour.");

  const startDate = parseDateInput(values.startDate);
  const dueDate = parseDateInput(values.dueDate);
  if (startDate === "invalid") return fail("The start date isn't a valid date.");
  if (dueDate === "invalid") return fail("The due date isn't a valid date.");
  if (startDate && dueDate && dueDate < startDate) return fail("The due date can't be before the start date.");

  return {
    ok: true as const,
    data: {
      name: values.name,
      description: values.description || null,
      status: values.status as ProjectStatus,
      color: values.color.toLowerCase(),
      startDate,
      dueDate,
      notes: values.notes || null,
    },
  };
}

export async function createProject(_state: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  await requireAdmin();
  const result = readForm(formData);
  if (!result.ok) return result.state;

  const project = await db.project.create({ data: result.data });
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  id: string,
  _state: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await requireAdmin();
  const result = readForm(formData);
  if (!result.ok) return result.state;

  const updated = await db.project.updateMany({ where: { id }, data: result.data });
  if (updated.count === 0) return { error: "This project no longer exists." };

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function setProjectStatus(id: string, status: ProjectStatus): Promise<void> {
  await requireAdmin();
  if (!isProjectStatus(status)) return;
  await db.project.updateMany({ where: { id }, data: { status } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

// Deleting a project keeps its tasks and time logs; they just lose the link.
export async function deleteProject(id: string): Promise<void> {
  await requireAdmin();
  await db.project.deleteMany({ where: { id } });
  revalidatePath("/projects");
  redirect("/projects");
}
