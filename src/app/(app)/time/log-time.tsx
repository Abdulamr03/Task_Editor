"use client";

import type { LinkGroups } from "@/lib/tasks";
import { createTimeLog } from "./actions";
import { TimeForm } from "./time-form";

export function LogTime({ links, date }: { links: LinkGroups; date: string }) {
  return <TimeForm action={createTimeLog} links={links} submitLabel="Log time" initial={{ date, duration: "", link: "", note: "" }} />;
}
