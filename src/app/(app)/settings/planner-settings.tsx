"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { toHHMM } from "@/lib/planner/time";
import type { SettingsState } from "./actions";
import { ActionForm } from "./action-form";

type Location = { name: string; lat: number; lng: number; tz: string };
type Values = {
  dayStart: number; dayEnd: number; maxBlock: number; breakMinutes: number; lunchStart: number; lunchMinutes: number;
  prayersEnabled: boolean; locationName: string; latitude: number; longitude: number; timeZone: string;
  method: string; asrMethod: string; prayerMinutes: number;
};

// Settings → Day planner: hours, breaks, lunch, and prayer times.
export function PlannerSettingsForm({
  action,
  values,
  locations,
  methods,
  timeZones,
  todayPrayers,
}: {
  action: (s: SettingsState, fd: FormData) => Promise<SettingsState>;
  values: Values;
  locations: readonly Location[];
  methods: readonly { value: string; label: string }[];
  timeZones: string[];
  todayPrayers: string;
}) {
  const known = locations.find((l) => l.name === values.locationName && Math.abs(l.lat - values.latitude) < 0.01);
  const [place, setPlace] = useState(known ? known.name : "custom");
  const [name, setName] = useState(values.locationName);
  const [lat, setLat] = useState(String(values.latitude));
  const [lng, setLng] = useState(String(values.longitude));
  const [tz, setTz] = useState(values.timeZone);
  const [prayers, setPrayers] = useState(values.prayersEnabled);

  const select = (label: string, name: string, def: number, options: number[], unit = "min") => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select name={name} defaultValue={def} className={inputClass}>
        {options.map((o) => (
          <option key={o} value={o}>{o === 0 ? "No lunch break" : `${o} ${unit}`}</option>
        ))}
      </select>
    </label>
  );

  return (
    <ActionForm action={action} submitLabel="Save day planner settings">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Your day</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Start work
            <input type="time" name="dayStart" defaultValue={toHHMM(values.dayStart)} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Finish work
            <input type="time" name="dayEnd" defaultValue={toHHMM(values.dayEnd)} required className={inputClass} />
          </label>
          {select("Longest focus block", "maxBlock", values.maxBlock, [30, 45, 60, 75, 90, 120])}
          {select("Break after each block", "breakMinutes", values.breakMinutes, [5, 10, 15, 20, 30])}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Lunch at
            <input type="time" name="lunchStart" defaultValue={toHHMM(values.lunchStart)} className={inputClass} />
          </label>
          {select("Lunch length", "lunchMinutes", values.lunchMinutes, [0, 15, 30, 45, 60])}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Prayer times</legend>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="prayersEnabled" checked={prayers} onChange={(e) => setPrayers(e.target.checked)} className="h-4 w-4" />
          Keep prayer times free in my plan
        </label>
        <div className={`grid gap-4 sm:grid-cols-2 ${prayers ? "" : "opacity-50"}`}>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Location
            <select
              value={place}
              onChange={(e) => {
                setPlace(e.target.value);
                const l = locations.find((x) => x.name === e.target.value);
                if (l) {
                  setName(l.name);
                  setLat(String(l.lat));
                  setLng(String(l.lng));
                  setTz(l.tz);
                }
              }}
              className={inputClass}
            >
              {locations.map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
              <option value="custom">Other place (enter coordinates)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Place name
            <input name="locationName" value={name} onChange={(e) => { setName(e.target.value); setPlace("custom"); }} maxLength={80} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Latitude
            <input name="latitude" inputMode="decimal" value={lat} onChange={(e) => { setLat(e.target.value); setPlace("custom"); }} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Longitude
            <input name="longitude" inputMode="decimal" value={lng} onChange={(e) => { setLng(e.target.value); setPlace("custom"); }} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Calculation method
            <select name="method" defaultValue={values.method} className={inputClass}>
              {methods.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Asr time
            <select name="asrMethod" defaultValue={values.asrMethod} className={inputClass}>
              <option value="Standard">Standard (Shafi&apos;i, Maliki, Hanbali)</option>
              <option value="Hanafi">Hanafi (later Asr)</option>
            </select>
          </label>
          {select("Time to keep free for each prayer", "prayerMinutes", values.prayerMinutes, [5, 10, 15, 20, 30])}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Time zone
            <select name="timeZone" value={tz} onChange={(e) => setTz(e.target.value)} className={inputClass}>
              {timeZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-sm text-slate-500">{todayPrayers}</p>
      </fieldset>
    </ActionForm>
  );
}
