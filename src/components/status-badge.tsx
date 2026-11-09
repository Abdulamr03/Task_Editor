import type { ProjectStatus } from "@prisma/client";
import { STATUS_STYLES, statusLabel } from "@/lib/projects";

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{statusLabel(status)}</span>
  );
}
