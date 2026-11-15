"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const LINKS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/tasks", label: "Today", icon: "✅" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/learning", label: "Learning", icon: "🧭" },
  { href: "/courses", label: "Courses", icon: "🎓" },
  { href: "/time", label: "Time", icon: "⏱" },
  { href: "/achievements", label: "Achievements", icon: "🏆" },
  { href: "/export", label: "Export", icon: "📄" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// The page links, listed down the side menu.
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Pages" className="flex flex-col gap-0.5">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              active
                ? "bg-blue-600/10 font-semibold text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            }`}
          >
            <span aria-hidden="true" className="w-5 text-center">
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
