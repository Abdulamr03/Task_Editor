// Turns what you type in "Time spent" into minutes.
// Accepts: "45", "45m", "1h", "1h 30m", "1h30", "1.5h", "1:30".
// Returns null if it can't be read or isn't between 1 minute and 24 hours.
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase().replace(",", ".");
  if (!text) return null;
  let minutes: number | null = null;

  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(\d+):([0-5]?\d)$/))) {
    minutes = Number(m[1]) * 60 + Number(m[2]);
  } else if ((m = text.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?\s*(?:(\d+)\s*(?:m(?:in(?:utes?)?)?)?)?$/))) {
    minutes = Math.round(Number(m[1]) * 60) + Number(m[2] ?? 0);
  } else if ((m = text.match(/^(\d+)\s*(?:m|min|mins|minutes?)?$/))) {
    minutes = Number(m[1]);
  }
  if (minutes === null || !Number.isFinite(minutes) || minutes < 1 || minutes > 24 * 60) return null;
  return minutes;
}
