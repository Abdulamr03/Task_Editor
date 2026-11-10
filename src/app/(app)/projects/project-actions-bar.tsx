"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";
import { buttonClass } from "@/components/ui";
import { deleteProject, setProjectStatus } from "./actions";

// Edit / archive / delete buttons on a project's page (admins only).
export function ProjectActionsBar({ id, name, status }: { id: string; name: string; status: ProjectStatus }) {
  const [pending, startTransition] = useTransition();
  const archived = status === "ARCHIVED";

  return (
    <>
      <Link href={`/projects/${id}/edit`} className={buttonClass.secondary}>
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        className={buttonClass.secondary}
        onClick={() => startTransition(() => setProjectStatus(id, archived ? "ACTIVE" : "ARCHIVED"))}
      >
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button
        type="button"
        disabled={pending}
        className={buttonClass.danger}
        onClick={() => {
          if (confirm(`Delete "${name}" for good?\n\nIts tasks are kept but no longer linked to a project. Archive it instead if you might need it again.`)) {
            startTransition(() => deleteProject(id));
          }
        }}
      >
        Delete
      </button>
    </>
  );
}
