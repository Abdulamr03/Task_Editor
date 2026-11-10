# Task Editor

A personal web app to track daily tasks, learning paths and projects — with an
admin login to edit everything from the browser, and PDF export of chosen
tasks and progress.

> Status: setup, login, projects, learning paths, daily tasks, dashboard, time log and PDF export done. Backup (JSON export / import) comes next — see the [build order](docs/PLAN.md#build-order-one-labelled-pull-request-each).

## Run it locally

You need **Node.js 20.19 or newer** (22 LTS recommended; check with `node -v`) and either **Docker** or your own **PostgreSQL 16** database.

1. Install packages:
   ```bash
   npm install
   ```
2. Start the database (skip if you use your own Postgres):
   ```bash
   docker compose up -d
   ```
3. Create your settings file:
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and:
   - set `SESSION_SECRET` to a random value of 32+ characters (for example, the output of `openssl rand -base64 32`);
   - change `DATABASE_URL` if you use your own database.
4. Create the database tables:
   ```bash
   npm run db:migrate
   ```
5. Start the app and open http://localhost:3000:
   ```bash
   npm run dev
   ```

## Login

- **First visit:** with no accounts yet, the app opens a **Welcome** page where
  you create the admin account (name, email, password of 8+ characters).
  This page stops working once an account exists.
- **After that:** every page needs a login. Logging in keeps you signed in for
  7 days, or until you click **Log out**.
- **Account menu**: click your initials at the top right for Settings,
  Light / Dark / System, **Switch account** and **Log out**.
- **Forgot your password?** Reset it from the terminal:
  ```bash
  npm run user:reset-password
  ```
  It asks for the email and a new password. The password is visible while you type it.

## Settings

Open it from the account menu (your initials, top right).

- **Personal information**: change your name and the email you log in with;
  see your role and since when you're a member.
- **Appearance**: Light, Dark or System (follows your device). Applies at once
  and is remembered in this browser. Also in the account menu.
- **Password**: change it (needs the current one). Other devices are logged out.
- **Accounts** (admins only): add accounts — e.g. a **viewer** who can look at
  everything and export PDFs but not change anything — change roles, remove
  accounts. There is always at least one admin.
- **Log out**, **Switch account** (log out and log in as someone else) and
  **Log out on all devices**.
- **Delete my account** (asks for your password). The only admin can't delete
  themselves while other accounts exist. The last account can choose to delete
  all data too; the app then shows the Welcome page again.

## Dashboard (Home)

The first page after logging in.

- **Four tiles**:
  - **Today**: tasks done out of tasks planned, and the time left.
  - **Overdue**: unfinished tasks from earlier days (red when there are any).
  - **Streak**: days in a row with at least one finished task or learning step.
    Until you finish something today, it shows yesterday's streak so it doesn't
    look broken in the morning.
  - **This week**: tasks finished since Monday, and their planned time.
- **To do today**: today's unfinished tasks; tick them off right here.
- **Tasks done this week**: a bar per day, Monday to Sunday. Hover a bar to see
  the number; click it to open that day.
- **Active projects** and **Learning**: progress bars, due dates and the next step.

## Projects

Open **Projects** in the top bar.

- **New project**: name, description, status, start and due date, colour, notes.
  The due date can't be before the start date.
- **Project page**: progress (finished tasks out of all tasks), dates, notes, and
  buttons to **Edit**, **Archive** / **Unarchive** and **Delete**.
- **Filters**: *Current* (everything except archived), *Active*, *Paused*, *Done*, *Archived*.
- **Due dates** turn amber within 7 days and red when overdue.
- **Archive vs delete**: archiving hides a project but keeps it. Deleting removes it
  for good; its tasks are kept but no longer linked to a project.
- Only admins see the edit buttons. Viewers can look but not change anything.

## Learning paths

Open **Learning** in the top bar. A learning path is a course, book or topic
split into steps you tick off.

- **New learning path**: name, description, status, colour, notes. Then add steps.
- **Steps**: each has a title, an optional link (course page, video, PDF…) and
  optional notes. Tick the box when it's done; the date is saved.
  Use ↑ ↓ to reorder, ✎ to edit, ✕ to delete.
- **Progress** is finished steps out of all steps. The list shows the next step to do.
- **Archive / delete** work like projects. Deleting a path also deletes its steps.
- Viewers see the steps but can't tick or change them.

## Daily tasks

Open **Today** in the top bar.

- **Add a task** in the box at the top. Click **+ Priority, time, project…** to
  set a priority, a time estimate in minutes, and a project or learning path.
- **Tick the box** when it's done. **Start** marks it *in progress*.
  **Tomorrow →** moves it to the next day. ✎ edits it (including its date), ✕ deletes it.
- The top line shows how many are done and roughly how much time is left.
- **‹ Today ›** and the date field show other days, past or future.
- **Unfinished from earlier**: on Today, tasks left undone on past days are
  listed in red. Move them one by one, or all at once with **Move all to today**.
- **Recurring tasks** (button at the top right): tasks that repeat every day or
  on weekdays. They're added to Today the first time you open it that day.
  Pause one to stop it for a while. If you delete today's copy, it won't come
  back until tomorrow. Missed days aren't carried over: each day gets its own copy.
- Tasks linked to a project or learning path also appear on its page, and
  count towards the project's progress bar.

## Time log

Open **Time** in the top bar to record how long you actually spent on things.

- **Log time**: date (today by default), time spent, project or learning path
  (optional), note (optional). Time can be typed as `45`, `45m`, `1h`,
  `1h 30m`, `1h30`, `1.5h` or `1:30`, or picked with the quick buttons.
  After saving, the date and project stay filled in for the next entry.
- **Week view**: ‹ This week › to move between weeks. The total and a bar per
  project / learning path show where the time went, biggest first.
- **Entries** are grouped by day; ✎ edits and ✕ deletes an entry.
- Project and learning path pages show **Time spent** (in total and this week).
  The dashboard's **This week** tile shows the hours logged.

## PDF export

Open **Export** in the top bar.

1. **Dates**: pick a preset (This week, Last week, This month, Last month,
   Last 30 days, Today) or any From / To dates (up to one year).
2. **What to include**: tick projects and learning paths (archived ones start
   unticked; **All** / **None** help), and **Other tasks** for tasks without a link.
3. **Sections**: Unfinished tasks, Completed work (tasks and learning steps
   finished in the range), Progress, Time spent, Notes.
4. **Download PDF**, or **Preview in a new tab** to look first.

The report starts with summary numbers, then one part per project / learning
path, with page numbers at the bottom. It uses the Noto Sans font (in `fonts/`,
free under the SIL Open Font License), so accents, Greek and Cyrillic print
correctly. Viewers can export too.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app in development mode |
| `npm run build` / `npm start` | Build and run the production version |
| `npm run lint` | Check code style |
| `npm run typecheck` | Check TypeScript types |
| `npm run db:migrate` | Apply schema changes to the local database (creates a migration) |
| `npm run db:deploy` | Apply existing migrations (for hosting) |
| `npm run db:studio` | Open Prisma Studio to browse the database |
| `npm run user:reset-password` | Set a new password for an account |

## Project layout

```
prisma/schema.prisma   Database tables (see data model in docs/PLAN.md)
prisma/migrations/     Database change history
src/app/(app)/         Pages that need a login (layout with header + log out)
src/app/(app)/projects Projects list, new, detail and edit pages + save actions
src/app/(app)/learning Learning paths and their steps
src/app/(app)/tasks    Today / any day, recurring tasks, task actions
src/app/(app)/time     Time log: log, week totals, entries
src/app/(app)/export   Export page; export/pdf/route.ts makes the PDF
src/app/(app)/settings Settings: profile, appearance, password, accounts, delete
src/app/logout/        Clears the login cookie (also used by Switch account)
src/lib/theme.ts       Light / dark / system setting (cookie)
src/lib/report/        Report data (data.ts) and PDF layout (document.tsx)
fonts/                 Noto Sans for the PDF (+ its licence)
src/app/login/         Login page and log in / log out actions
src/app/setup/         First-time admin account page
src/components/        Shared UI pieces (cards, buttons, progress bar, nav, item form)
src/lib/db.ts          Shared database client
src/lib/session.ts     Login cookie (signed, HTTP-only, 7 days)
src/lib/auth.ts        Password hashing, requireUser / requireAdmin
src/lib/dates.ts       Date helpers (no time-zone shifts)
src/lib/projects.ts    Project statuses, labels and colours
src/lib/tasks.ts       Task priorities, repeat rules, time formatting
src/lib/recurring.ts   Adds today's recurring tasks (once per day)
src/lib/stats.ts       Dashboard numbers: streak, tasks done this week
src/lib/duration.ts    Reads "1h 30m", "1:30", "45"… as minutes
src/lib/time-stats.ts  Week helpers and time totals
src/middleware.ts      Sends logged-out visitors to /login
scripts/               Command-line helpers (password reset)
docker-compose.yml     Local PostgreSQL
```

## Documentation

- [Project plan](docs/PLAN.md) — features, tech stack, data model, build order
- [Workflow](docs/WORKFLOW.md) — how changes are proposed, approved and labelled
- [Changelog](CHANGELOG.md) — every change, newest first
