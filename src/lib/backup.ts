import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// Backup = all your data (not accounts or passwords) in one JSON file.
// Restore replaces the current data with a backup's data, in one transaction:
// if anything fails, nothing changes.

export const BACKUP_APP = "task-editor";
export const BACKUP_VERSION = 1;

// ---------- Which fields each table has in a backup ----------

type FieldType =
  | "id"
  | "id?"
  | "string"
  | "string?"
  | "int"
  | "int?"
  | "bool"
  | "date"
  | "date?"
  | readonly string[]; // one of these values

const PROJECT_STATUS = ["ACTIVE", "PAUSED", "DONE", "ARCHIVED"] as const;
const TASK_STATUS = ["TODO", "IN_PROGRESS", "DONE"] as const;
const PRIORITY = ["LOW", "MEDIUM", "HIGH"] as const;
const RULE = ["DAILY", "WEEKDAYS"] as const;

const TABLES = {
  projects: {
    id: "id", name: "string", description: "string?", status: PROJECT_STATUS, color: "string",
    startDate: "date?", dueDate: "date?", notes: "string?", createdAt: "date", updatedAt: "date",
  },
  learningPaths: {
    id: "id", title: "string", description: "string?", status: PROJECT_STATUS, color: "string",
    notes: "string?", createdAt: "date", updatedAt: "date",
  },
  milestones: {
    id: "id", learningPathId: "id", title: "string", description: "string?", order: "int",
    createdAt: "date", updatedAt: "date",
  },
  learningSteps: {
    id: "id", learningPathId: "id", milestoneId: "id?", title: "string", order: "int", done: "bool",
    doneAt: "date?", resourceUrl: "string?", notes: "string?", estimateMinutes: "int?", pages: "string?",
    coveredById: "id?", createdAt: "date", updatedAt: "date",
  },
  recurringTasks: {
    id: "id", title: "string", notes: "string?", rule: RULE, priority: PRIORITY, estimateMinutes: "int?",
    active: "bool", lastCreatedOn: "date?", projectId: "id?", learningPathId: "id?", createdAt: "date", updatedAt: "date",
  },
  tasks: {
    id: "id", title: "string", notes: "string?", date: "date", status: TASK_STATUS, priority: PRIORITY,
    estimateMinutes: "int?", completedAt: "date?", projectId: "id?", learningPathId: "id?", recurringTaskId: "id?",
    createdAt: "date", updatedAt: "date",
  },
  timeLogs: {
    id: "id", date: "date", minutes: "int", note: "string?", projectId: "id?", learningPathId: "id?", createdAt: "date",
  },
} as const satisfies Record<string, Record<string, FieldType>>;

export type TableName = keyof typeof TABLES;
export const TABLE_LABELS: Record<TableName, string> = {
  projects: "Projects",
  learningPaths: "Learning paths",
  milestones: "Milestones",
  learningSteps: "Learning steps",
  recurringTasks: "Recurring tasks",
  tasks: "Tasks",
  timeLogs: "Time log entries",
};
const TABLE_NAMES = Object.keys(TABLES) as TableName[];

type Row = Record<string, unknown>;
export type BackupData = Record<TableName, Row[]>;
export type Counts = Record<TableName, number>;

// ---------- Export ----------

const selectOf = (table: TableName) => Object.fromEntries(Object.keys(TABLES[table]).map((f) => [f, true]));

export async function buildBackup() {
  const [projects, learningPaths, milestones, learningSteps, recurringTasks, tasks, timeLogs] = await Promise.all([
    db.project.findMany({ select: selectOf("projects"), orderBy: { createdAt: "asc" } }),
    db.learningPath.findMany({ select: selectOf("learningPaths"), orderBy: { createdAt: "asc" } }),
    db.milestone.findMany({ select: selectOf("milestones"), orderBy: [{ learningPathId: "asc" }, { order: "asc" }] }),
    db.learningStep.findMany({ select: selectOf("learningSteps"), orderBy: [{ learningPathId: "asc" }, { order: "asc" }] }),
    db.recurringTask.findMany({ select: selectOf("recurringTasks"), orderBy: { createdAt: "asc" } }),
    db.task.findMany({ select: selectOf("tasks"), orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
    db.timeLog.findMany({ select: selectOf("timeLogs"), orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
  ]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    note: "Task Editor backup. Accounts and passwords are not included.",
    data: { projects, learningPaths, milestones, learningSteps, recurringTasks, tasks, timeLogs },
  };
}

export async function currentCounts(): Promise<Counts> {
  const [projects, learningPaths, milestones, learningSteps, recurringTasks, tasks, timeLogs] = await Promise.all([
    db.project.count(),
    db.learningPath.count(),
    db.milestone.count(),
    db.learningStep.count(),
    db.recurringTask.count(),
    db.task.count(),
    db.timeLog.count(),
  ]);
  return { projects, learningPaths, milestones, learningSteps, recurringTasks, tasks, timeLogs };
}

// ---------- Checking a backup file ----------

export type ParsedBackup = { exportedAt: string | null; data: BackupData; counts: Counts; fixes: number };

export class BackupError extends Error {}

// Checks every row and field. Broken links (e.g. a task pointing at a project
// that isn't in the file) are cleared, and `fixes` counts how many.
export function parseBackup(raw: unknown): ParsedBackup {
  const file = raw as { app?: unknown; version?: unknown; exportedAt?: unknown; data?: unknown } | null;
  if (!file || typeof file !== "object" || file.app !== BACKUP_APP) {
    throw new BackupError("This isn't a Task Editor backup file.");
  }
  if (typeof file.version !== "number" || file.version > BACKUP_VERSION) {
    throw new BackupError("This backup was made by a newer version of Task Editor. Update the app first.");
  }
  const input = (file.data ?? {}) as Record<string, unknown>;

  const data = {} as BackupData;
  for (const table of TABLE_NAMES) {
    const rows = input[table] ?? [];
    if (!Array.isArray(rows)) throw new BackupError(`“${table}” in the backup isn't a list.`);
    const seen = new Set<string>();
    data[table] = rows.map((row, i) => {
      const clean = cleanRow(table, row, i);
      if (seen.has(clean.id as string)) throw new BackupError(`${TABLE_LABELS[table]}: the id “${clean.id}” appears twice.`);
      seen.add(clean.id as string);
      return clean;
    });
  }

  // Links between tables.
  let fixes = 0;
  const ids = (t: TableName) => new Set(data[t].map((r) => r.id as string));
  const projects = ids("projects"), paths = ids("learningPaths"), milestones = ids("milestones");
  const steps = ids("learningSteps"), recurring = ids("recurringTasks");
  const milestonePath = new Map(data.milestones.map((m) => [m.id as string, m.learningPathId as string]));
  const clear = (row: Row, field: string, valid: Set<string>) => {
    if (row[field] != null && !valid.has(row[field] as string)) {
      row[field] = null;
      fixes++;
    }
  };

  // Milestones and steps must belong to a learning path in the file.
  const before = data.milestones.length + data.learningSteps.length;
  data.milestones = data.milestones.filter((m) => paths.has(m.learningPathId as string));
  data.learningSteps = data.learningSteps.filter((s) => paths.has(s.learningPathId as string));
  fixes += before - data.milestones.length - data.learningSteps.length;

  for (const s of data.learningSteps) {
    clear(s, "milestoneId", milestones);
    // A step's milestone must be in the same learning path.
    if (s.milestoneId && milestonePath.get(s.milestoneId as string) !== s.learningPathId) {
      s.milestoneId = null;
      fixes++;
    }
    clear(s, "coveredById", steps);
    if (s.coveredById === s.id) {
      s.coveredById = null;
      fixes++;
    }
  }
  for (const r of data.recurringTasks) {
    clear(r, "projectId", projects);
    clear(r, "learningPathId", paths);
  }
  for (const t of data.tasks) {
    clear(t, "projectId", projects);
    clear(t, "learningPathId", paths);
    clear(t, "recurringTaskId", recurring);
  }
  for (const l of data.timeLogs) {
    clear(l, "projectId", projects);
    clear(l, "learningPathId", paths);
  }
  // A recurring task makes at most one task per day.
  const perDay = new Set<string>();
  for (const t of data.tasks) {
    if (!t.recurringTaskId) continue;
    const key = `${t.recurringTaskId}|${(t.date as Date).toISOString()}`;
    if (perDay.has(key)) {
      t.recurringTaskId = null;
      fixes++;
    } else perDay.add(key);
  }

  const counts = Object.fromEntries(TABLE_NAMES.map((t) => [t, data[t].length])) as Counts;
  return { exportedAt: typeof file.exportedAt === "string" ? file.exportedAt : null, data, counts, fixes };
}

function cleanRow(table: TableName, row: unknown, index: number): Row {
  if (!row || typeof row !== "object") throw new BackupError(`${TABLE_LABELS[table]} #${index + 1} isn't valid.`);
  const r = row as Row;
  const out: Row = {};
  for (const [field, type] of Object.entries(TABLES[table]) as [string, FieldType][]) {
    const v = r[field];
    const where = `${TABLE_LABELS[table]} #${index + 1}, “${field}”`;
    const optional = typeof type === "string" && type.endsWith("?");
    if (v === undefined || v === null) {
      if (optional) {
        out[field] = null;
        continue;
      }
      if (type === "bool") {
        out[field] = false;
        continue;
      }
      if (field === "createdAt" || field === "updatedAt") {
        out[field] = new Date();
        continue;
      }
      throw new BackupError(`${where} is missing.`);
    }
    if (Array.isArray(type)) {
      if (!type.includes(v as string)) throw new BackupError(`${where} has an unknown value.`);
      out[field] = v;
    } else if (type === "id" || type === "id?") {
      if (typeof v !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(v)) throw new BackupError(`${where} isn't a valid id.`);
      out[field] = v;
    } else if (type === "string" || type === "string?") {
      if (typeof v !== "string") throw new BackupError(`${where} should be text.`);
      if (v.length > 20000) throw new BackupError(`${where} is too long.`);
      out[field] = v;
    } else if (type === "int" || type === "int?") {
      if (!Number.isInteger(v) || Math.abs(v as number) > 1e9) throw new BackupError(`${where} should be a whole number.`);
      out[field] = v;
    } else if (type === "bool") {
      if (typeof v !== "boolean") throw new BackupError(`${where} should be true or false.`);
      out[field] = v;
    } else {
      const d = typeof v === "string" ? new Date(v) : null;
      if (!d || Number.isNaN(d.getTime())) throw new BackupError(`${where} isn't a valid date.`);
      out[field] = d;
    }
  }
  return out;
}

// ---------- Restore ----------

// Deletes all current data and writes the backup's data instead.
// Accounts are not touched.
export async function restoreBackup(data: BackupData): Promise<void> {
  await db.$transaction(
    async (tx) => {
      // Delete in an order that respects the links.
      await tx.timeLog.deleteMany();
      await tx.task.deleteMany();
      await tx.recurringTask.deleteMany();
      await tx.learningStep.updateMany({ data: { coveredById: null } });
      await tx.learningStep.deleteMany();
      await tx.milestone.deleteMany();
      await tx.learningPath.deleteMany();
      await tx.project.deleteMany();

      await tx.project.createMany({ data: data.projects as unknown as Prisma.ProjectCreateManyInput[] });
      await tx.learningPath.createMany({ data: data.learningPaths as unknown as Prisma.LearningPathCreateManyInput[] });
      await tx.milestone.createMany({ data: data.milestones as unknown as Prisma.MilestoneCreateManyInput[] });
      // Steps first without their "covered by" links (they point at other steps), then the links.
      await tx.learningStep.createMany({
        data: data.learningSteps.map((s) => ({ ...s, coveredById: null })) as unknown as Prisma.LearningStepCreateManyInput[],
      });
      for (const s of data.learningSteps) {
        if (s.coveredById) {
          await tx.learningStep.update({
            where: { id: s.id as string },
            // Keep the backup's "last changed" time instead of now.
            data: { coveredById: s.coveredById as string, updatedAt: s.updatedAt as Date },
          });
        }
      }
      await tx.recurringTask.createMany({ data: data.recurringTasks as unknown as Prisma.RecurringTaskCreateManyInput[] });
      await tx.task.createMany({ data: data.tasks as unknown as Prisma.TaskCreateManyInput[] });
      await tx.timeLog.createMany({ data: data.timeLogs as unknown as Prisma.TimeLogCreateManyInput[] });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}
