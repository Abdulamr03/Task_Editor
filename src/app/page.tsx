import { db } from "@/lib/db";

// Always check the database on each visit, not once at build time.
export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<{ ok: boolean; message: string }> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, message: "Database connected." };
  } catch {
    return {
      ok: false,
      message: "Database not reachable. Check DATABASE_URL in .env and that Postgres is running.",
    };
  }
}

export default async function Home() {
  const status = await checkDatabase();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-bold">Task Editor</h1>
      <p className="text-slate-500">
        Project setup is done. Login, projects, learning paths and tasks come next.
      </p>
      <p
        className={`rounded-md border px-3 py-2 text-sm ${
          status.ok
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
        }`}
      >
        {status.message}
      </p>
    </main>
  );
}
