import { db } from "@/lib/db";
import { requireUser, MIN_PASSWORD_LENGTH } from "@/lib/auth";
import { getTheme } from "@/lib/theme";
import { buttonClass, Card, inputClass, PageHeader } from "@/components/ui";
import { logout } from "@/app/login/actions";
import { changePassword, createAccount, deleteOwnAccount, logoutEverywhere, savePlannerSettings, updateProfile } from "./actions";
import { PlannerSettingsForm } from "./planner-settings";
import { getPlannerSettings, LOCATIONS } from "@/lib/planner/settings";
import { METHODS, prayerTimes } from "@/lib/planner/prayers";
import { toHHMM } from "@/lib/planner/time";
import { today } from "@/lib/dates";
import { ActionForm } from "./action-form";
import { ThemePicker } from "./theme-picker";
import { AccountsList, Avatar } from "./accounts";
import { BackupSection } from "./backup-section";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireUser();
  const isAdmin = me.role === "ADMIN";
  const [theme, accounts, planner] = await Promise.all([
    getTheme(),
    db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    getPlannerSettings(),
  ]);
  const todayPrayers =
    `Today in ${planner.locationName}: ` + prayerTimes(planner, today()).map((p) => `${p.name} ${toHHMM(p.minutes)}`).join(" · ");
  const timeZones = Intl.supportedValuesOf("timeZone");
  if (!timeZones.includes(planner.timeZone)) timeZones.unshift(planner.timeZone);
  const others = accounts.length - 1;
  const since = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" />

      {/* Personal information */}
      <Section title="Personal information" id="profile">
        <div className="mb-5 flex items-center gap-3">
          <Avatar name={me.name} />
          <div className="text-sm">
            <p className="font-medium">{me.name}</p>
            <p className="text-slate-500">
              {isAdmin ? "Admin — can change everything" : "Viewer — can only look"} · member since {since(me.createdAt)}
            </p>
          </div>
        </div>
        <ActionForm action={updateProfile} submitLabel="Save">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input name="name" defaultValue={me.name} required maxLength={80} autoComplete="name" className={inputClass} />
            </Field>
            <Field label="Email" hint="Used to log in.">
              <input name="email" type="email" defaultValue={me.email} required autoComplete="email" className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" id="appearance">
        <ThemePicker initial={theme} />
        <p className="mt-3 text-xs text-slate-500">Saved in this browser.</p>
      </Section>

      {/* Password */}
      <Section title="Password" id="password">
        <ActionForm action={changePassword} submitLabel="Change password" resetOnSuccess>
          <Field label="Current password">
            <input name="current" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`New password (min. ${MIN_PASSWORD_LENGTH} characters)`}>
              <input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={inputClass} />
            </Field>
            <Field label="Repeat new password">
              <input name="confirm" type="password" required autoComplete="new-password" className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </Section>

      {/* Accounts */}
      {isAdmin && (
        <Section title="Accounts" id="accounts">
          <p className="-mt-2 mb-4 text-sm text-slate-500">
            Everyone who can log in. A <strong>viewer</strong> can look at everything and export PDFs, but can&apos;t change anything — handy for sharing your progress.
          </p>
          <AccountsList
            accounts={accounts.map((a) => ({ id: a.id, name: a.name, email: a.email, role: a.role, isMe: a.id === me.id, since: since(a.createdAt) }))}
          />
          <details className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <summary className="cursor-pointer font-medium">+ Add an account</summary>
            <div className="mt-4">
              <ActionForm action={createAccount} submitLabel="Create account" resetOnSuccess>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    <input name="name" required maxLength={80} className={inputClass} />
                  </Field>
                  <Field label="Email">
                    <input name="email" type="email" required className={inputClass} />
                  </Field>
                  <Field label={`Password (min. ${MIN_PASSWORD_LENGTH} characters)`} hint="Share it with them; they can change it in Settings.">
                    <input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={inputClass} />
                  </Field>
                  <Field label="Role">
                    <select name="role" defaultValue="VIEWER" className={inputClass}>
                      <option value="VIEWER">Viewer — can only look</option>
                      <option value="ADMIN">Admin — can change everything</option>
                    </select>
                  </Field>
                </div>
              </ActionForm>
            </div>
          </details>
        </Section>
      )}

      {/* Day planner */}
      {isAdmin && (
        <Section title="Day planner" id="planner">
          <p className="-mt-2 mb-4 text-sm text-slate-500">Used by “Plan my day” on Today. Prayer times are calculated on this computer; nothing is sent anywhere.</p>
          <PlannerSettingsForm
            action={savePlannerSettings}
            values={planner}
            locations={LOCATIONS}
            methods={METHODS}
            timeZones={timeZones}
            todayPrayers={todayPrayers}
          />
        </Section>
      )}

      {/* Backup */}
      {isAdmin && (
        <Section title="Backup" id="backup">
          <BackupSection />
        </Section>
      )}

      {/* Session */}
      <Section title="Log out" id="session">
        <div className="flex flex-wrap gap-2">
          <form action={logout}>
            <button type="submit" className={buttonClass.secondary}>
              Log out
            </button>
          </form>
          <a href="/logout?reason=switch" className={buttonClass.secondary}>
            Switch account
          </a>
          <form action={logoutEverywhere}>
            <button type="submit" className={buttonClass.secondary}>
              Log out on all devices
            </button>
          </form>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          “Switch account” logs you out and opens the login page, so you can log in as someone else.
        </p>
      </Section>

      {/* Delete account */}
      <Section title="Delete my account" id="delete" danger>
        <p className="-mt-2 mb-4 text-sm text-slate-500">
          {others > 0
            ? "Removes your login. Projects, tasks and other data stay, for the other accounts."
            : "You're the only account. Your projects, tasks and other data stay unless you tick the box below; the next visitor will see the Welcome page to create a new admin."}
        </p>
        <ActionForm
          action={deleteOwnAccount}
          submitLabel="Delete my account"
          danger
          confirmText="Delete your account for good? This can't be undone."
        >
          <Field label="Type your password to confirm">
            <input name="password" type="password" required autoComplete="current-password" className={`${inputClass} sm:max-w-sm`} />
          </Field>
          {others === 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="wipe" value="1" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium">Also delete all data</span>
                <span className="block text-slate-500">Every project, learning path, task, recurring task and time log.</span>
              </span>
            </label>
          )}
        </ActionForm>
      </Section>
    </main>
  );
}

function Section({ title, id, danger = false, children }: { title: string; id: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <Card className={danger ? "border-red-500/40 dark:border-red-500/40" : ""}>
        <h2 className={`mb-4 text-lg font-semibold ${danger ? "text-red-700 dark:text-red-400" : ""}`}>{title}</h2>
        {children}
      </Card>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}
