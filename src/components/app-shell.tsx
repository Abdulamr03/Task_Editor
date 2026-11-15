"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLinks } from "./nav-links";

import { SIDEBAR_COOKIE } from "@/lib/sidebar";
const WIDE = "(min-width: 1024px)";

// The page frame: a top bar with ☰, and the side menu with every page.
// Wide screens: the menu stays open beside the page (☰ hides / shows it, remembered).
// Phones and tablets: ☰ slides it in over the page; a link, the backdrop or Esc closes it.
export function AppShell({ sidebarOpen, userMenu, children }: { sidebarOpen: boolean; userMenu: React.ReactNode; children: React.ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(sidebarOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the phone menu after moving to another page.
  useEffect(() => setMobileOpen(false), [pathname]);

  // Esc closes it; the page behind doesn't scroll while it's open.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [mobileOpen]);

  function toggle() {
    if (window.matchMedia(WIDE).matches) {
      const next = !desktopOpen;
      setDesktopOpen(next);
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "open" : "closed"}; path=/; max-age=31536000; samesite=lax`;
    } else {
      setMobileOpen((o) => !o);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <button
            type="button"
            onClick={toggle}
            aria-controls="side-menu"
            aria-expanded={mobileOpen || desktopOpen}
            aria-label="Menu"
            title="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ☰
          </button>
          <span className="whitespace-nowrap font-bold">Task Editor</span>
          <div className="ml-auto">{userMenu}</div>
        </div>
      </header>

      {/* Phones: dark backdrop behind the open menu. */}
      <div
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        id="side-menu"
        aria-label="Side menu"
        className={[
          "fixed bottom-0 left-0 z-50 w-64 overflow-y-auto border-r border-slate-200 bg-white p-3 transition-transform duration-200 dark:border-slate-700 dark:bg-slate-900",
          // Phones: full height, over the page.
          "top-0",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
          // Wide screens: under the top bar, beside the page.
          "lg:top-14 lg:z-20 lg:w-60 lg:shadow-none",
          desktopOpen ? "lg:translate-x-0" : "lg:-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center justify-between px-1 lg:hidden">
          <span className="font-bold">Task Editor</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>
        <NavLinks onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className={`transition-[padding] duration-200 ${desktopOpen ? "lg:pl-60" : ""}`}>
        <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
      </div>
    </div>
  );
}
