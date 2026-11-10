"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { Avatar } from "@/app/(app)/settings/accounts";
import { ThemePicker } from "@/app/(app)/settings/theme-picker";
import type { Theme } from "@/lib/theme";

// Top-right button with your initials; opens Settings, appearance,
// Switch account and Log out.
export function UserMenu({ name, email, role, theme }: { name: string; email: string; role: string; theme: Theme }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Avatar name={name} size="sm" />
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
        <span aria-hidden="true" className="text-xs text-slate-400">▾</span>
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="px-3 py-2">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            {role === "VIEWER" && <p className="mt-1 text-xs text-slate-500">Viewer — can only look</p>}
          </div>
          <div className="px-3 pb-2">
            <ThemePicker initial={theme} compact />
          </div>
          <hr className="my-1 border-slate-200 dark:border-slate-700" />
          <Link href="/settings" role="menuitem" className={item} onClick={() => setOpen(false)}>
            ⚙ Settings
          </Link>
          <a href="/logout?reason=switch" role="menuitem" className={item}>
            ⇄ Switch account
          </a>
          <form action={logout}>
            <button type="submit" role="menuitem" className={item}>
              ↪ Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
