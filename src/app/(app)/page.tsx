import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();

  return (
    <main className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold">Hello, {user.name}</h1>
      <p className="text-slate-500">
        You&apos;re logged in. Projects, learning paths and tasks come next.
      </p>
    </main>
  );
}
