// Course helpers that are safe in the browser: reading pasted course content
// and working out progress.

export type ContentLine = { title: string; heading: boolean; done: boolean };

// One line per lesson. A line starting with "#" is a section heading.
// A line starting with "[x]" is already done (used when editing content).
// Numbering, bullets and durations copied from course pages are kept as text,
// except leading bullets ("-", "*", "•") which are removed.
export function parseContent(text: string): ContentLine[] {
  const out: ContentLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    let done = false;
    const tick = line.match(/^\[(x|X| )\]\s*/);
    if (tick) {
      done = tick[1].toLowerCase() === "x";
      line = line.slice(tick[0].length);
    }
    const heading = /^#+\s*/.test(line);
    line = line.replace(/^#+\s*/, "").replace(/^[-*•]\s+/, "").trim().slice(0, 300);
    if (!line) continue;
    out.push({ title: line, heading, done: heading ? false : done });
    if (out.length >= 1000) break;
  }
  return out;
}

// The opposite of parseContent, for the "Edit content" box.
export function contentToText(items: { title: string; heading: boolean; done: boolean }[]): string {
  return items.map((i) => (i.heading ? `# ${i.title}` : `${i.done ? "[x] " : ""}${i.title}`)).join("\n");
}

export function courseProgress(items: { heading: boolean; done: boolean }[]) {
  const lessons = items.filter((i) => !i.heading);
  const done = lessons.filter((i) => i.done).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0 };
}

const PROVIDERS: [RegExp, string][] = [
  [/(^|\.)udemy\.com$/, "Udemy"],
  [/(^|\.)coursera\.org$/, "Coursera"],
  [/(^|\.)edx\.org$/, "edX"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)pluralsight\.com$/, "Pluralsight"],
  [/(^|\.)linkedin\.com$/, "LinkedIn Learning"],
  [/(^|\.)scrimba\.com$/, "Scrimba"],
  [/(^|\.)frontendmasters\.com$/, "Frontend Masters"],
  [/(^|\.)zerotomastery\.io$/, "Zero To Mastery"],
  [/(^|\.)datacamp\.com$/, "DataCamp"],
  [/(^|\.)codecademy\.com$/, "Codecademy"],
  [/(^|\.)freecodecamp\.org$/, "freeCodeCamp"],
  [/(^|\.)khanacademy\.org$/, "Khan Academy"],
  [/(^|\.)skillshare\.com$/, "Skillshare"],
  [/(^|\.)edraak\.org$/, "Edraak"],
];

export function providerFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return PROVIDERS.find(([re]) => re.test(host))?.[1] ?? host;
  } catch {
    return null;
  }
}
