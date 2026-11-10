"use client";

import type { LinkGroups } from "@/lib/tasks";
import { createRecurring } from "../actions";
import { TaskForm } from "../task-form";

export function AddRecurring({ links }: { links: LinkGroups }) {
  return (
    <TaskForm
      action={createRecurring}
      links={links}
      showRule
      submitLabel="Add recurring task"
      initial={{ title: "", notes: "", priority: "MEDIUM", estimate: "", link: "", rule: "DAILY" }}
    />
  );
}
