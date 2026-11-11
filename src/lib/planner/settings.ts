import { db } from "@/lib/db";

// Settings for "Plan my day". Stored in one row; created with defaults on first use.
export async function getPlannerSettings() {
  return (
    (await db.plannerSettings.findUnique({ where: { id: "default" } })) ??
    (await db.plannerSettings.create({ data: { id: "default" } }))
  );
}

export type PlannerSettingsRow = Awaited<ReturnType<typeof getPlannerSettings>>;

// Places to pick from in Settings (anything else: enter coordinates).
export const LOCATIONS = [
  { name: "Cairo", lat: 30.0444, lng: 31.2357, tz: "Africa/Cairo" },
  { name: "Giza", lat: 30.0131, lng: 31.2089, tz: "Africa/Cairo" },
  { name: "Alexandria", lat: 31.2001, lng: 29.9187, tz: "Africa/Cairo" },
  { name: "Mansoura", lat: 31.0409, lng: 31.3785, tz: "Africa/Cairo" },
  { name: "Tanta", lat: 30.7865, lng: 31.0004, tz: "Africa/Cairo" },
  { name: "Zagazig", lat: 30.5877, lng: 31.502, tz: "Africa/Cairo" },
  { name: "Port Said", lat: 31.2653, lng: 32.3019, tz: "Africa/Cairo" },
  { name: "Suez", lat: 29.9668, lng: 32.5498, tz: "Africa/Cairo" },
  { name: "Ismailia", lat: 30.5965, lng: 32.2715, tz: "Africa/Cairo" },
  { name: "Asyut", lat: 27.1783, lng: 31.1859, tz: "Africa/Cairo" },
  { name: "Luxor", lat: 25.6872, lng: 32.6396, tz: "Africa/Cairo" },
  { name: "Aswan", lat: 24.0889, lng: 32.8998, tz: "Africa/Cairo" },
  { name: "Makkah", lat: 21.3891, lng: 39.8579, tz: "Asia/Riyadh" },
  { name: "Madinah", lat: 24.5247, lng: 39.5692, tz: "Asia/Riyadh" },
  { name: "Riyadh", lat: 24.7136, lng: 46.6753, tz: "Asia/Riyadh" },
  { name: "Jeddah", lat: 21.4858, lng: 39.1925, tz: "Asia/Riyadh" },
  { name: "Dubai", lat: 25.2048, lng: 55.2708, tz: "Asia/Dubai" },
  { name: "Doha", lat: 25.2854, lng: 51.531, tz: "Asia/Qatar" },
  { name: "Kuwait City", lat: 29.3759, lng: 47.9774, tz: "Asia/Kuwait" },
  { name: "Amman", lat: 31.9454, lng: 35.9284, tz: "Asia/Amman" },
  { name: "Istanbul", lat: 41.0082, lng: 28.9784, tz: "Europe/Istanbul" },
  { name: "London", lat: 51.5072, lng: -0.1276, tz: "Europe/London" },
  { name: "Berlin", lat: 52.52, lng: 13.405, tz: "Europe/Berlin" },
  { name: "New York", lat: 40.7128, lng: -74.006, tz: "America/New_York" },
] as const;
