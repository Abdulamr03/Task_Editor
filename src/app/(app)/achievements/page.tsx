import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { KIND_ICON, KIND_LABEL } from "@/lib/achievements";
import { EmptyState, PageHeader } from "@/components/ui";
import { RemoveAchievementButton } from "./remove-button";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const user = await requireUser();
  const achievements = await db.achievement.findMany({ orderBy: { earnedAt: "desc" } });
  const count = (k: keyof typeof KIND_LABEL) => achievements.filter((a) => a.kind === k).length;
  const thisYear = achievements.filter((a) => a.earnedAt.getFullYear() === new Date().getFullYear()).length;

  return (
    <main>
      <PageHeader title="🏆 Achievements" />
      {achievements.length === 0 ? (
        <EmptyState>
          No achievements yet. Finish a course (tick its whole checklist), complete every level of a learning path, or mark a project as Done
          to earn one. <Link href="/courses" className="text-blue-600 underline dark:text-blue-400">Go to your courses →</Link>
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total" value={achievements.length} />
            <Stat label="Courses" value={count("COURSE")} />
            <Stat label="Learning paths" value={count("LEARNING_PATH")} />
            <Stat label={`This year`} value={thisYear} />
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a) => {
              const href = a.courseId ? `/courses/${a.courseId}` : a.learningPathId ? `/learning/${a.learningPathId}` : a.projectId ? `/projects/${a.projectId}` : null;
              return (
                <li
                  key={a.id}
                  className="relative flex gap-3 rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:from-amber-500/10 dark:to-slate-900"
                >
                  <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-2xl">
                    {KIND_ICON[a.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{KIND_LABEL[a.kind]}</p>
                    <p className="font-semibold">
                      {href ? (
                        <Link href={href} className="hover:underline">
                          {a.title}
                        </Link>
                      ) : (
                        a.title
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.earnedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      {a.detail ? ` · ${a.detail}` : ""}
                    </p>
                  </div>
                  {user.role === "ADMIN" && <RemoveAchievementButton id={a.id} title={a.title} />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
