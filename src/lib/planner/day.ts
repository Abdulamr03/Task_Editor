import { fixedBlocks } from "./prayers";
import { workCapacity, type DayShape, type FixedBlock } from "./pack";
import { getPlannerSettings, type PlannerSettingsRow } from "./settings";
import { minutesInZone, toHHMM } from "./time";

// The time now in the planner's time zone, rounded up to the next 5 minutes.
export function nowRounded(settings: PlannerSettingsRow): number {
  return Math.ceil(minutesInZone(new Date(), settings.timeZone) / 5) * 5;
}

// Everything about a day's shape: settings, fixed blocks (prayers, lunch) and capacity.
// `startAt` plans from that time instead of the start of the working day
// ("from now" on today).
export async function dayFrame(day: Date, startAt?: number | null) {
  const settings = await getPlannerSettings();
  const start = startAt == null ? settings.dayStart : Math.min(Math.max(startAt, settings.dayStart), settings.dayEnd);
  const shape: DayShape = {
    dayStart: start,
    dayEnd: settings.dayEnd,
    maxBlock: settings.maxBlock,
    breakMinutes: settings.breakMinutes,
  };
  // Only the prayers and lunch that are still ahead.
  const fixed: FixedBlock[] = fixedBlocks(settings, day).filter((f) => f.end > start);
  return {
    settings,
    fixed,
    shape,
    capacity: workCapacity(fixed, shape),
    fixedSummary: fixed.map((f) => `${f.title} ${toHHMM(f.start)}–${toHHMM(f.end)}`).join(", "),
  };
}
