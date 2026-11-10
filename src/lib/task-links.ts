import { db } from "@/lib/db";
import type { LinkGroups } from "@/lib/tasks";

// Projects and learning paths a task can be linked to (not archived).
export async function getLinkGroups(): Promise<LinkGroups> {
  const [projects, paths] = await Promise.all([
    db.project.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    db.learningPath.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" }, select: { id: true, title: true, color: true } }),
  ]);
  return {
    projects: projects.map((p) => ({ value: `project:${p.id}`, label: p.name, color: p.color })),
    paths: paths.map((p) => ({ value: `path:${p.id}`, label: p.title, color: p.color })),
  };
}
