"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";
import { buttonClass } from "@/components/ui";

// Edit / archive / delete buttons on a project's or learning path's page (admins only).
export function ItemActionsBar({
  editHref,
  name,
  status,
  setStatus,
  remove,
  deleteWarning,
}: {
  editHref: string;
  name: string;
  status: ProjectStatus;
  setStatus: (status: ProjectStatus) => Promise<void>;
  remove: () => Promise<void>;
  deleteWarning: string;
}) {
  const [pending, startTransition] = useTransition();
  const archived = status === "ARCHIVED";

  return (
    <>
      <Link href={editHref} className={buttonClass.secondary}>
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        className={buttonClass.secondary}
        onClick={() => startTransition(() => setStatus(archived ? "ACTIVE" : "ARCHIVED"))}
      >
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button
        type="button"
        disabled={pending}
        className={buttonClass.danger}
        onClick={() => {
          if (confirm(`Delete "${name}" for good?\n\n${deleteWarning} Archive it instead if you might need it again.`)) {
            startTransition(() => remove());
          }
        }}
      >
        Delete
      </button>
    </>
  );
}
