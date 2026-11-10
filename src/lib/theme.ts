import { cookies } from "next/headers";

// Light / dark / follow the device. Saved in a cookie so the page is drawn
// in the right colours straight away (no flash), on every page.
export const THEME_COOKIE = "theme";
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(v: unknown): v is Theme {
  return THEMES.includes(v as Theme);
}

export async function getTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(value) ? value : "system";
}
