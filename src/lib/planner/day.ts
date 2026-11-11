import { fixedBlocks } from "./prayers";
import { workCapacity, type DayShape, type FixedBlock } from "./pack";
import { getPlannerSettings } from "./settings";
import { toHHMM } from "./time";

// Everything about a day's shape: settings, fixed blocks (prayers, lunch) and capacity.
export async function dayFrame(day: Date) {
  const settings = await getPlannerSettings();
  const fixed: FixedBlock[] = fixedBlocks(settings, day);
  const shape: DayShape = {
    dayStart: settings.dayStart,
    dayEnd: settings.dayEnd,
    maxBlock: settings.maxBlock,
    breakMinutes: settings.breakMinutes,
  };
  return {
    settings,
    fixed,
    shape,
    capacity: workCapacity(fixed, shape),
    fixedSummary: fixed.map((f) => `${f.title} ${toHHMM(f.start)}–${toHHMM(f.end)}`).join(", "),
  };
}
