"use client";

import type { LinkGroups } from "@/lib/tasks";
import { Card } from "@/components/ui";
import { createTask } from "./actions";
import { TaskForm } from "./task-form";

// The "Add a task…" box at the top of a day. Clears itself after each task.
export function QuickAdd({ day, links }: { day: string; links: LinkGroups }) {
  return (
    <Card padded={false} className="p-4">
      <TaskForm
        compact
        action={createTask}
        links={links}
        hiddenDate={day}
        submitLabel="Add"
        initial={{ title: "", notes: "", priority: "MEDIUM", estimate: "", link: "" }}
      />
    </Card>
  );
}
