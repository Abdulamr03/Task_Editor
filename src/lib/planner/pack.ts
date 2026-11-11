// Places a day's work items on the clock, in order, around fixed blocks
// (prayers, lunch), adding a break after each stretch of focused work.
// Pure and safe in the browser, so the preview and the saved plan match.

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type PlanItem = {
  key: string;
  kind: "task" | "project" | "study";
  title: string;
  minutes: number;
  difficulty: Difficulty;
  reason: string;
  taskId: string | null;
  projectId: string | null;
  learningPathId: string | null;
  color: string | null;
};

export type FixedBlock = { kind: "prayer" | "lunch"; title: string; start: number; end: number };

export type Block = {
  start: number;
  end: number;
  kind: "work" | "break" | "prayer" | "lunch";
  title: string;
  itemKey?: string;
  itemKind?: PlanItem["kind"];
  difficulty?: Difficulty;
  color?: string | null;
  taskId?: string | null;
};

export type DayShape = { dayStart: number; dayEnd: number; maxBlock: number; breakMinutes: number };

// Work sessions shorter than this aren't worth starting before a prayer or lunch.
const MIN_SESSION = 25;

export function pack(items: PlanItem[], fixed: FixedBlock[], day: DayShape): { blocks: Block[]; unplaced: PlanItem[] } {
  const fx = [...fixed].sort((a, b) => a.start - b.start);
  const work: Block[] = [];
  const unplaced: PlanItem[] = [];
  let cursor = day.dayStart;
  let focused = 0; // minutes of work since the last rest

  for (const item of items) {
    let remaining = item.minutes;
    const sessions: Block[] = [];
    while (remaining > 0 && cursor < day.dayEnd) {
      const next = fx.find((f) => f.end > cursor);
      if (next && cursor >= next.start) {
        // Inside a prayer or lunch: it counts as a rest.
        cursor = next.end;
        focused = 0;
        continue;
      }
      const limit = Math.min(next ? next.start : day.dayEnd, day.dayEnd);
      const free = limit - cursor;
      // Time for a break (also when the focus left is too short for a session).
      if (focused >= day.maxBlock || (day.maxBlock - focused < MIN_SESSION && remaining > day.maxBlock - focused)) {
        const rest = Math.min(day.breakMinutes, free);
        work.push({ start: cursor, end: cursor + rest, kind: "break", title: "Break" });
        cursor += rest;
        focused = 0;
        continue;
      }
      let chunk = Math.min(remaining, day.maxBlock - focused, free);
      // Don't leave a tiny leftover for later: stop earlier so the rest is a real session.
      if (chunk < remaining && remaining - chunk < MIN_SESSION && remaining - MIN_SESSION >= MIN_SESSION) chunk = remaining - MIN_SESSION;
      if (chunk < MIN_SESSION && chunk < remaining) {
        // Too short to start; skip to after the next fixed block.
        if (!next) break;
        cursor = next.end;
        focused = 0;
        continue;
      }
      sessions.push({
        start: cursor,
        end: cursor + chunk,
        kind: "work",
        title: item.title,
        itemKey: item.key,
        itemKind: item.kind,
        difficulty: item.difficulty,
        color: item.color,
        taskId: item.taskId,
      });
      cursor += chunk;
      remaining -= chunk;
      focused += chunk;
    }
    if (sessions.length > 1) sessions.forEach((s, i) => (s.title = `${item.title} (part ${i + 1}/${sessions.length})`));
    work.push(...sessions);
    if (remaining > 0) unplaced.push({ ...item, minutes: remaining });
  }

  const inDay = fx.filter((f) => f.end > day.dayStart && f.start < day.dayEnd).map((f): Block => ({ ...f }));
  return { blocks: [...work, ...inDay].sort((a, b) => a.start - b.start), unplaced };
}

// Roughly how many minutes of work fit in the day, after fixed blocks and breaks.
export function workCapacity(fixed: FixedBlock[], day: DayShape): number {
  const fixedMinutes = fixed.reduce((s, f) => s + Math.max(0, Math.min(f.end, day.dayEnd) - Math.max(f.start, day.dayStart)), 0);
  const free = Math.max(0, day.dayEnd - day.dayStart - fixedMinutes);
  const breaks = Math.floor(free / (day.maxBlock + day.breakMinutes)) * day.breakMinutes;
  return Math.max(0, free - breaks);
}
