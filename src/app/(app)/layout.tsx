import { requireUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";

// Layout for every page that needs a logged-in user.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="font-bold">Task Editor</span>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">
              {user.name}
              {user.role === "VIEWER" && " (viewer)"}
            </span>
            <form action={logout}>
              <button type="submit" className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800">
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
