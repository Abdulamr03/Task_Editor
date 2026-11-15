"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { safeUrl } from "@/lib/resources";
import { parseContent, providerFromUrl } from "@/lib/courses";
import { checkPaths, syncCourse } from "@/lib/achievements";

export type CourseFormState =
  | {
      error?: string;
      values?: Record<string, string>;
      stepIds?: string[];
    }
  | undefined;

const FIELDS = ["title", "url", "provider", "notes", "content"] as const;

function refresh(courseId?: string) {
  revalidatePath("/courses");
  if (courseId) revalidatePath(`/courses/${courseId}`);
  revalidatePath("/learning", "layout");
  revalidatePath("/achievements");
  revalidatePath("/");
}

function readForm(formData: FormData) {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()]));
  const stepIds = [...new Set(formData.getAll("stepIds").map(String))].slice(0, 200);
  const fail = (error: string) => ({ ok: false as const, state: { error, values, stepIds } });

  if (!values.title) return fail("Enter the course name.");
  if (values.title.length > 200) return fail("The name can be at most 200 characters.");
  const url = values.url ? safeUrl(values.url) : null;
  if (values.url && !url) return fail("The link should start with https:// (copy it from the course page).");
  if (values.notes.length > 5000) return fail("The notes are too long.");
  return {
    ok: true as const,
    stepIds,
    content: parseContent(values.content),
    data: {
      title: values.title,
      url,
      provider: values.provider.slice(0, 60) || providerFromUrl(url),
      notes: values.notes || null,
    },
  };
}

// Links the chosen learning levels to the course (and unlinks the others).
async function linkSteps(courseId: string, stepIds: string[]) {
  const valid = (await db.learningStep.findMany({ where: { id: { in: stepIds } }, select: { id: true } })).map((s) => s.id);
  await db.learningStep.updateMany({ where: { courseId, id: { notIn: valid } }, data: { courseId: null } });
  await db.learningStep.updateMany({ where: { id: { in: valid } }, data: { courseId } });
  return valid;
}

// A finished course ticks levels linked to it later too.
async function tickIfComplete(courseId: string) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { completedAt: true } });
  if (!course?.completedAt) return;
  const steps = await db.learningStep.findMany({ where: { courseId, done: false }, select: { learningPathId: true } });
  if (steps.length === 0) return;
  await db.learningStep.updateMany({ where: { courseId, done: false }, data: { done: true, doneAt: new Date() } });
  await checkPaths([...new Set(steps.map((s) => s.learningPathId))]);
}

export async function createCourse(_state: CourseFormState, formData: FormData): Promise<CourseFormState> {
  await requireAdmin();
  const r = readForm(formData);
  if (!r.ok) return r.state;
  const course = await db.course.create({
    data: {
      ...r.data,
      items: { create: r.content.map((c, i) => ({ title: c.title, heading: c.heading, done: c.done, doneAt: c.done ? new Date() : null, order: i })) },
    },
  });
  await linkSteps(course.id, r.stepIds);
  await syncCourse(course.id);
  refresh(course.id);
  redirect(`/courses/${course.id}`);
}

export async function updateCourse(id: string, _state: CourseFormState, formData: FormData): Promise<CourseFormState> {
  await requireAdmin();
  const r = readForm(formData);
  if (!r.ok) return r.state;
  const updated = await db.course.updateMany({ where: { id }, data: r.data });
  if (updated.count === 0) return { error: "This course no longer exists." };
  await linkSteps(id, r.stepIds);
  await tickIfComplete(id);
  refresh(id);
  redirect(`/courses/${id}`);
}

export async function deleteCourse(id: string): Promise<void> {
  await requireAdmin();
  // Lessons go with it; linked levels and an earned achievement are kept.
  await db.course.deleteMany({ where: { id } });
  refresh();
  redirect("/courses");
}

// Ticks a lesson. Returns achievements earned by it (when it finished the course).
export async function toggleCourseItem(itemId: string, done: boolean): Promise<{ earned: string[] }> {
  await requireAdmin();
  const item = await db.courseItem
    .update({ where: { id: itemId, heading: false }, data: { done, doneAt: done ? new Date() : null } })
    .catch(() => null);
  if (!item) return { earned: [] };
  const earned = await syncCourse(item.courseId);
  refresh(item.courseId);
  return { earned };
}

// Replaces the content with the edited text. Lessons keep their ticks when the
// title stays the same ("[x] " in front also ticks a line).
export async function saveCourseContent(courseId: string, text: string): Promise<{ error?: string; earned?: string[] }> {
  await requireAdmin();
  if (text.length > 200_000) return { error: "That's too much text." };
  const course = await db.course.findUnique({ where: { id: courseId }, include: { items: { orderBy: { order: "asc" } } } });
  if (!course) return { error: "This course no longer exists." };
  const lines = parseContent(text);
  const old = new Map<string, { done: boolean; doneAt: Date | null }[]>();
  for (const it of course.items) {
    if (it.heading) continue;
    const list = old.get(it.title) ?? [];
    list.push({ done: it.done, doneAt: it.doneAt });
    old.set(it.title, list);
  }
  const now = new Date();
  const data = lines.map((l, i) => {
    const prev = l.heading ? undefined : old.get(l.title)?.shift();
    const done = !l.heading && (l.done || Boolean(prev?.done));
    return { courseId, title: l.title, heading: l.heading, order: i, done, doneAt: done ? (prev?.doneAt ?? now) : null };
  });
  await db.$transaction([db.courseItem.deleteMany({ where: { courseId } }), db.courseItem.createMany({ data })]);
  const earned = await syncCourse(courseId);
  refresh(courseId);
  return { earned };
}

// "＋ Add to my courses" on a study resource: makes a course from it, linked to
// the level (or links the level to the course with the same link).
export async function addCourseFromResource(stepId: string, title: string, url: string): Promise<void> {
  await requireAdmin();
  const link = safeUrl(url);
  const step = await db.learningStep.findUnique({ where: { id: stepId }, select: { id: true } });
  if (!link || !step) return;
  const existing = await db.course.findFirst({ where: { url: link } });
  const course =
    existing ??
    (await db.course.create({ data: { title: title.trim().slice(0, 200) || "Course", url: link, provider: providerFromUrl(link) } }));
  await db.learningStep.update({ where: { id: stepId }, data: { courseId: course.id } });
  await tickIfComplete(course.id);
  refresh(course.id);
  redirect(`/courses/${course.id}${existing ? "" : "?added=1"}`);
}

export async function deleteAchievement(id: string): Promise<void> {
  await requireAdmin();
  await db.achievement.deleteMany({ where: { id } });
  refresh();
}
