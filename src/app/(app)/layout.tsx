import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { UserMenu } from "@/components/user-menu";
import { getTheme } from "@/lib/theme";

// Layout for every page that needs a logged-in user: top bar + side menu.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, theme, jar] = await Promise.all([requireUser(), getTheme(), cookies()]);
  // On wide screens the side menu is open unless you closed it.
  const sidebarOpen = jar.get(SIDEBAR_COOKIE)?.value !== "closed";

  return (
    <AppShell sidebarOpen={sidebarOpen} userMenu={<UserMenu name={user.name} email={user.email} role={user.role} theme={theme} />}>
      {children}
    </AppShell>
  );
}
