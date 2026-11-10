import { requireUser } from "@/lib/auth";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";
import { getTheme } from "@/lib/theme";

// Layout for every page that needs a logged-in user.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, theme] = await Promise.all([requireUser(), getTheme()]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {/* On phones the links move to a second row under the app name. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <span className="whitespace-nowrap font-bold">Task Editor</span>
          <div className="order-last -mx-3 w-full sm:order-none sm:mx-0 sm:mr-auto sm:w-auto">
            <NavLinks />
          </div>
          <UserMenu name={user.name} email={user.email} role={user.role} theme={theme} />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
