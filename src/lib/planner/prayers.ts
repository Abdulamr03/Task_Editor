import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import type { FixedBlock } from "./pack";
import { minutesInZone } from "./time";

// Prayer times (offline calculation) and the fixed blocks of a working day.

export const METHODS = [
  { value: "Egyptian", label: "Egyptian General Authority of Survey" },
  { value: "MuslimWorldLeague", label: "Muslim World League" },
  { value: "UmmAlQura", label: "Umm al-Qura (Makkah)" },
  { value: "Karachi", label: "University of Islamic Sciences, Karachi" },
  { value: "Dubai", label: "Dubai" },
  { value: "Kuwait", label: "Kuwait" },
  { value: "Qatar", label: "Qatar" },
  { value: "Turkey", label: "Diyanet (Turkey)" },
  { value: "Singapore", label: "Singapore" },
  { value: "NorthAmerica", label: "ISNA (North America)" },
  { value: "MoonsightingCommittee", label: "Moonsighting Committee" },
  { value: "Tehran", label: "Tehran" },
] as const;

export type PrayerSettings = {
  latitude: number;
  longitude: number;
  timeZone: string;
  method: string;
  asrMethod: string; // "Standard" | "Hanafi"
};

export type PrayerTime = { name: string; minutes: number };

// The five daily prayers for a calendar day (day = midnight UTC of that date).
export function prayerTimes(s: PrayerSettings, day: Date): PrayerTime[] {
  const make = (CalculationMethod as unknown as Record<string, () => ReturnType<typeof CalculationMethod.Egyptian>>)[s.method] ?? CalculationMethod.Egyptian;
  const params = make();
  params.madhab = s.asrMethod === "Hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  const date = new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const t = new PrayerTimes(new Coordinates(s.latitude, s.longitude), date, params);
  return [
    { name: "Fajr", minutes: minutesInZone(t.fajr, s.timeZone) },
    { name: "Dhuhr", minutes: minutesInZone(t.dhuhr, s.timeZone) },
    { name: "Asr", minutes: minutesInZone(t.asr, s.timeZone) },
    { name: "Maghrib", minutes: minutesInZone(t.maghrib, s.timeZone) },
    { name: "Isha", minutes: minutesInZone(t.isha, s.timeZone) },
  ];
}

export type DaySettings = PrayerSettings & {
  dayStart: number;
  dayEnd: number;
  lunchStart: number;
  lunchMinutes: number;
  prayersEnabled: boolean;
  prayerMinutes: number;
};

// Prayers that fall inside working hours, plus lunch (moved after a prayer if they clash).
export function fixedBlocks(s: DaySettings, day: Date): FixedBlock[] {
  const blocks: FixedBlock[] = [];
  if (s.prayersEnabled) {
    for (const p of prayerTimes(s, day)) {
      if (p.minutes >= s.dayStart && p.minutes < s.dayEnd) {
        blocks.push({ kind: "prayer", title: p.name, start: p.minutes, end: Math.min(p.minutes + s.prayerMinutes, s.dayEnd) });
      }
    }
  }
  if (s.lunchMinutes > 0) {
    let start = s.lunchStart;
    for (const p of blocks) if (start < p.end && start + s.lunchMinutes > p.start) start = p.end;
    if (start >= s.dayStart && start + s.lunchMinutes <= s.dayEnd) {
      blocks.push({ kind: "lunch", title: "Lunch", start, end: start + s.lunchMinutes });
    }
  }
  return blocks.sort((a, b) => a.start - b.start);
}
