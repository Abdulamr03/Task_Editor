"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isProjectStatus } from "@/lib/projects";
import type { ItemFormState } from "@/components/item-form";

// ---------- Learning paths ----------

const PATH_FIELDS = ["name", "description", "status", "color", "notes"] as const;

function readPathForm(formData: FormData) {
  const values = Object.fromEntries(PATH_FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const fail = (error: string) => ({ ok: false as const, state: { error, values } });

  if (!values.name) return fail("Enter a name for the learning path.");
  if (values.name.length > 100) return fail("The name can be at most 100 characters.");
  if (!isProjectStatus(values.status)) return fail("Choose a status.");
  if (!/^#[0-9a-fA-F]{6}$/.test(values.color)) return fail("Choose a colour.");

  return {
    ok: true as const,
    data: {
      title: values.name,
      description: values.description || null,
      status: values.status as ProjectStatus,
      color: values.color.toLowerCase(),
      notes: values.notes || null,
    },
  };
}

function refresh(pathId?: string) {
  revalidatePath("/learning");
  if (pathId) revalidatePath(`/learning/${pathId}`);
}

export async function createLearningPath(_state: ItemFormState, formData: FormData): Promise<ItemFormState> {
  await requireAdmin();
  const result = readPathForm(formData);
  if (!result.ok) return result.state;

  const path = await db.learningPath.create({ data: result.data });
  refresh();
  redirect(`/learning/${path.id}`);
}

export async function updateLearningPath(id: string, _state: ItemFormState, formData: FormData): Promise<ItemFormState> {
  await requireAdmin();
  const result = readPathForm(formData);
  if (!result.ok) return result.state;

  const updated = await db.learningPath.updateMany({ where: { id }, data: result.data });
  if (updated.count === 0) return { error: "This learning path no longer exists." };
  refresh(id);
  redirect(`/learning/${id}`);
}

export async function setLearningPathStatus(id: string, status: ProjectStatus): Promise<void> {
  await requireAdmin();
  if (!isProjectStatus(status)) return;
  await db.learningPath.updateMany({ where: { id }, data: { status } });
  refresh(id);
}

// Deleting a path deletes its steps too; tasks and time logs are kept, unlinked.
export async function deleteLearningPath(id: string): Promise<void> {
  await requireAdmin();
  await db.learningPath.deleteMany({ where: { id } });
  refresh();
  redirect("/learning");
}

// ---------- Steps ----------

export type StepFormState = { error?: string; values?: Record<string, string>; savedAt?: number } | undefined;

const STEP_FIELDS = ["title", "resourceUrl", "notes"] as const;

function readStepForm(formData: FormData) {
  const values = Object.fromEntries(STEP_FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const fail = (error: string) => ({ ok: false as const, state: { error, values } });

  if (!values.title) return fail("Enter a title for the step.");
  if (values.title.length > 200) return fail("The title can be at most 200 characters.");

  let resourceUrl: string | null = null;
  if (values.resourceUrl) {
    // Allow "example.com/course" as well as full links.
    const withScheme = /^[a-z]+:\/\//i.test(values.resourceUrl) ? values.resourceUrl : `https://${values.resourceUrl}`;
    try {
      const url = new URL(withScheme);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      resourceUrl = url.toString();
    } catch {
      return fail("The link must be a web address, like https://example.com/course.");
    }
  }

  return { ok: true as const, data: { title: values.title, resourceUrl, notes: values.notes || null } };
}

export async function addStep(pathId: string, _state: StepFormState, formData: FormData): Promise<StepFormState> {
  await requireAdmin();
  const result = readStepForm(formData);
  if (!result.ok) return result.state;

  const last = await db.learningStep.aggregate({ where: { learningPathId: pathId }, _max: { order: true } });
  try {
    await db.learningStep.create({
      data: { ...result.data, learningPathId: pathId, order: (last._max.order ?? 0) + 1 },
    });
  } catch {
    return { error: "This learning path no longer exists." };
  }
  refresh(pathId);
  return { savedAt: Date.now() };
}

export async function updateStep(stepId: string, _state: StepFormState, formData: FormData): Promise<StepFormState> {
  await requireAdmin();
  const result = readStepForm(formData);
  if (!result.ok) return result.state;

  const step = await db.learningStep.update({ where: { id: stepId }, data: result.data }).catch(() => null);
  if (!step) return { error: "This step no longer exists." };
  refresh(step.learningPathId);
  return { savedAt: Date.now() };
}

export async function toggleStep(stepId: string, done: boolean): Promise<void> {
  await requireAdmin();
  const step = await db.learningStep
    .update({ where: { id: stepId }, data: { done, doneAt: done ? new Date() : null } })
    .catch(() => null);
  if (step) refresh(step.learningPathId);
}

// Swap a step with the one above or below it.
export async function moveStep(stepId: string, direction: "up" | "down"): Promise<void> {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    const step = await tx.learningStep.findUnique({ where: { id: stepId } });
    if (!step) return;
    const neighbour = await tx.learningStep.findFirst({
      where: {
        learningPathId: step.learningPathId,
        order: direction === "up" ? { lt: step.order } : { gt: step.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbour) return;
    await tx.learningStep.update({ where: { id: step.id }, data: { order: neighbour.order } });
    await tx.learningStep.update({ where: { id: neighbour.id }, data: { order: step.order } });
  });
  const step = await db.learningStep.findUnique({ where: { id: stepId }, select: { learningPathId: true } });
  if (step) refresh(step.learningPathId);
}

export async function deleteStep(stepId: string): Promise<void> {
  await requireAdmin();
  const step = await db.learningStep.delete({ where: { id: stepId } }).catch(() => null);
  if (step) refresh(step.learningPathId);
}
