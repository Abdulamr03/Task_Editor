// Dates without a time (start date, due date, task date) are stored as
// midnight UTC. These helpers convert them to and from <input type="date">
// values ("YYYY-MM-DD") without shifting the day because of time zones.

export function parseDateInput(value: FormDataEntryValue | null): Date | null | "invalid" {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "invalid";
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text ? "invalid" : date;
}

export function toDateInput(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Today's date as midnight UTC, using the server's local calendar day.
export function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function daysUntil(date: Date): number {
  return Math.round((date.getTime() - today().getTime()) / 86_400_000);
}
