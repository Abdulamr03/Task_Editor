import { requireUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { NavLinks } from "@/components/nav-links";

// Layout for every page that needs a logged-in user.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {/* On phones the links move to a second row under the app name. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <span className="whitespace-nowrap font-bold">Task Editor</span>
          <div className="order-last -mx-3 w-full sm:order-none sm:mx-0 sm:mr-auto sm:w-auto">
            <NavLinks />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {user.name}
              {user.role === "VIEWER" && " (viewer)"}
            </span>
            <form action={logout}>
              <button type="submit" className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
