# Changelog

All changes to this project are listed here, newest first.
Each entry names the pull request label.

## Unreleased

### `feature` — Plan my day starts from now
- On **today**, "Plan my day" now plans from the time you press the button
  (rounded up to 5 minutes) until the end of your working day; before the day
  starts it still plans the whole day. A **Start from now (HH:MM)** checkbox
  (on by default, reset each time) lets you plan the whole day instead. Other
  days are unchanged.
- Claude is told the current time and only the time that's left; prayers and
  lunch already past are left out, and capacity is the remaining time.
- **Re-planning later in the day keeps what's behind you**: finished blocks,
  breaks and prayers before the new start stay in the timeline; unfinished past
  blocks are dropped.
- After the working day has ended, the planner says so and links to tomorrow.

### `feature` — Plan my day (with prayer times) and difficulty
- **Plan my day** on Today (`POST /tasks/plan` + review screen): Claude Opus 5.5
  chooses what to work on today and for how long — overdue / today's tasks,
  projects by deadline and open work, next learning-path levels — ordered hard
  work first, easy work later, with a one-line summary. Structured output,
  refusal fallback; ids are checked and unknown ones dropped.
- **Placed on the clock by the app** (`src/lib/planner/pack.ts`): inside working
  hours, around prayers and lunch, with a break after each focus block; long
  items split into parts; sessions at least 25 minutes; what doesn't fit is
  listed. The preview and the saved plan use the same code.
- **Prayer times** calculated offline with `adhan` (Egyptian method by default;
  12 methods; Standard or Hanafi Asr; any location and time zone).
- **Review**: change minutes, difficulty, order and titles, remove items; then
  **Use this plan** creates the day's project / study tasks, moves planned overdue
  tasks to the day and sets start times. **Your plan** timeline on Today with a
  Now marker and checkboxes; **Re-plan** (replaces, keeps finished work) and
  **Clear plan**.
- **Settings → Day planner**: hours, focus block, breaks, lunch, prayers
  (location presets incl. Egyptian cities, coordinates, method, Asr, minutes,
  time zone) with today's prayer times shown.
- **Difficulty** (Easy / Medium / Hard) on tasks and learning-path levels, in
  forms and lists; PDF import now proposes a difficulty per level.
- Planned tasks show their start time and are sorted by it.
- **Backup** now also includes day plans, planner settings, difficulty and
  planned times (older backups still restore).
- **Database migration** `day_planner`: `Difficulty` enum; `Task.difficulty`,
  `plannedStart`, `fromPlan`; `LearningStep.difficulty`; `DayPlan` and
  `PlannerSettings` tables. New package `adhan`.

### `feature` — Backup (download and restore)
- **Settings → Backup** (admins only).
- **Download backup** (`GET /settings/backup`): one JSON file
  (`task-editor-backup-<date>.json`, format version 1) with all projects,
  learning paths, milestones, steps, recurring tasks, tasks and time logs.
  Accounts and passwords are never included.
- **Restore** (`POST /settings/backup/restore`): the file is checked first
  (app, version, every field and value, duplicate ids) and a Now / After table
  is shown; after confirming, all data is replaced in one transaction (all or
  nothing). Accounts are kept, so you stay logged in. Broken links in a file are
  cleared and counted. A restored backup matches the original exactly
  (including "already covered" links and timestamps).
- Clear messages for: not JSON, not a Task Editor backup, newer version,
  invalid values, duplicate ids, files over 50 MB.

### `chore` — Own ports
- The app now runs on **http://localhost:3300** (was 3000) and the Docker
  database on **localhost:5433** (was 5432), so it doesn't clash with other
  local projects. Override with `PORT=… npm run dev` and `DB_PORT` in `.env`.
- **Update your `.env`**: change `localhost:5432` to `localhost:5433` in
  `DATABASE_URL`, then run `docker compose up -d` once to move the database.

### `feature` — Import learning paths from PDF, with milestones
- **Import from PDF** (`/learning/import`): upload a syllabus, textbook or notes
  (up to 24 MB / 600 pages, optional note). Claude Opus 5.5 reads it and
  proposes a learning path split into **milestones** and **levels** (with notes,
  time estimates and page references), using structured JSON output. Server-side
  refusal fallback is on (`fallbacks: "default"`).
- **Already covered**: your finished steps from other learning paths are sent
  along; levels they cover are marked and **ticked by default** on the review
  screen (untick to redo). Unknown ids from the AI are dropped.
- **Review screen**: rename path / milestones / levels, pick a colour, reorder
  and remove milestones, remove levels; then **Create learning path**.
- **Milestones on learning paths**: steps are grouped by milestone with a
  progress bar each; add, rename, reorder and delete milestones (steps kept);
  **+ Add level** inside a milestone; ↑ ↓ moves within its milestone.
- Steps can show a time estimate, page reference and "Already covered by …" link.
- Clear messages for: no API key (setup steps shown), not a PDF, too big,
  rejected key, rate limits, refusals, too-long documents.
- **Database migration** `milestones_and_covered_steps`: new `Milestone` table;
  `LearningStep.milestoneId`, `coveredById`, `estimateMinutes`, `pages`.
- New setting `ANTHROPIC_API_KEY` (optional) in `.env.example`; new package `@anthropic-ai/sdk`.

### `feature` — Settings, account menu and appearance
- **Account menu** in the top bar (your initials): name and email, Light /
  Dark / System switch, Settings, Switch account, Log out.
- **Settings page** (`/settings`):
  - **Personal information**: edit name and email (checked for duplicates),
    role and member-since date.
  - **Appearance**: Light, Dark or System with small previews; applies at once,
    saved in a cookie so pages load in the right colours with no flash.
  - **Password**: change with the current password; other devices are logged out.
  - **Accounts** (admins): add accounts (admin or read-only viewer), change
    roles, remove accounts; at least one admin is always kept.
  - **Log out**, **Switch account**, **Log out on all devices**.
  - **Delete my account** with password; the only admin is protected; the last
    account can also delete all data (the app returns to the Welcome page).
- **Login security**: logins now carry a session number
  (`User.sessionVersion`, migration `user_session_version`). Changing the
  password or "log out on all devices" ends every other login.
- **Fixed**: an outdated login (e.g. of a deleted account) could bounce between
  pages; it now goes through `/logout` to the login page with a clear message.
- **Login page** shows why you're there (logged out, switched, password changed…).
- **Dark mode** is now driven by the Appearance setting (`data-theme` on
  `<html>`); "System" follows the device as before.

### `feature` — PDF export
- **Export page** (`/export`, new **Export** link): date presets or any range
  (up to a year), projects and learning paths to include (All / None; archived
  ones start unticked), **Other tasks**, and sections: Unfinished tasks,
  Completed work, Progress, Time spent, Notes. Clear messages if something's missing.
- **PDF report** (`/export/pdf`, made on the server with `@react-pdf/renderer`):
  summary tiles, then per project / learning path its status and due date,
  progress bar, time logged, steps and tasks finished (with dates), unfinished
  tasks (overdue in red) and notes; page numbers on every page. **Download** or
  **Preview in a new tab**. The server checks the login and the options again.
- **Noto Sans font** bundled in `fonts/` (SIL Open Font License) so accents,
  Greek and Cyrillic print correctly; `next.config.ts` ships it with the PDF route.
- **Top bar** links now wrap onto two lines on phones instead of being cut off.

### `feature` — Time log
- **Time log page** (`/time`, new **Time** link): log time spent with date,
  duration, project / learning path and note. Durations can be typed as
  `45`, `1h 30m`, `1h30`, `1.5h`, `1:30` (1 minute to 24 hours) or picked with
  quick buttons; date and project stay filled in for the next entry.
- **Week view** with ‹ This week ›: total time, and a bar per project /
  learning path (biggest first, with time and share); entries grouped by day
  with edit and delete.
- **Time spent** card on project and learning path pages (total and this week).
- **Dashboard**: the This week tile shows hours logged (falls back to planned time).
- Shared project / learning path dropdown (`src/components/link-select.tsx`).

### `feature` — Dashboard
- **Home page is now a dashboard**: greeting and date, then four tiles:
  Today (done / planned, time left), Overdue (red with ⚠ when any),
  Streak (days in a row with a finished task or learning step) and
  This week (tasks finished since Monday, planned time).
- **To do today**: today's unfinished tasks, with the usual task buttons.
- **Tasks done this week** chart: one bar per day, hover for the number,
  click to open the day; a hidden table gives screen readers the same numbers.
- **Active projects** (soonest due first) and **Learning** (next step), each
  with progress bars; up to 6 of each.
- Recurring tasks are also added when the dashboard is opened.
- Fixed: lists inside cards had double padding; "1 of 1 tasks" now says "task".

### `feature` — Daily tasks, recurring tasks and carry over
- **Today page** (`/tasks`): quick-add box (title, plus optional priority, time
  estimate in minutes, project / learning path, notes), a summary
  ("1 of 3 done · about 1h 30m left") and the day's tasks: in progress first,
  then by priority; finished tasks in a separate **Done** list.
- **Task actions**: tick off (saves when), Start / Pause (*in progress*),
  Tomorrow →, edit (title, date, priority, time, link, notes), delete.
- **Other days**: ‹ Today › buttons and a date field (`/tasks?date=YYYY-MM-DD`).
- **Carry over**: Today lists unfinished tasks from earlier days in red, each
  with **Move to today**, plus **Move all to today**.
- **Recurring tasks** (`/tasks/recurring`): every day or weekdays only, with
  priority, time and link; pause / resume, delete (keeps tasks already added).
  Each one adds its task to Today once per day, the first time Today is opened.
- **Project and learning path pages** now list their linked tasks (unfinished
  ones and the 10 most recently finished); project progress bars now fill in.
- **Top bar**: new Today link.
- **Database migration** `recurring_once_per_day`: `RecurringTask.lastCreatedOn`
  and a unique (recurring task, date) rule on `Task`. Run `npm run db:migrate`.

### `feature` — Learning paths
- **Learning paths list** (`/learning`): cards with colour, status, description,
  the next step to do and a progress bar. Same filters as projects.
- **New / edit learning path**: name, description, status, colour, notes.
- **Learning path page** (`/learning/<id>`): progress, notes and the **steps**
  checklist, plus Edit, Archive / Unarchive and Delete (also deletes its steps).
- **Steps**: add (form stays open for the next one), tick off (saves the date,
  updates instantly), move up / down, edit, delete. Each step can have a link
  (checked to be a web address; `example.com` becomes `https://example.com`) and notes.
- **Top bar**: new Learning link; on phones the links move to a second row.
- **Shared form and action buttons** for projects and learning paths
  (`src/components/item-form.tsx`, `item-actions-bar.tsx`).
- Project and learning path titles keep their colour dot on the same line on phones.

### `feature` — Projects
- **Projects list** (`/projects`): cards with colour, status, description, due
  date and a progress bar. Filters: Current, Active, Paused, Done, Archived.
- **New / edit project** form: name, description, status, start and due date,
  colour, notes. Checks the name, dates (due can't be before start) and keeps
  what you typed after an error.
- **Project page** (`/projects/<id>`): progress, dates, notes, and Edit,
  Archive / Unarchive and Delete (asks first; tasks are kept, just unlinked).
- **Due dates** are amber within 7 days and red when overdue.
- **Progress** counts finished tasks out of all tasks linked to the project
  (fills in once Tasks are added).
- **Top bar** now has Home and Projects links.
- **Viewers** don't see edit buttons; all saving is admin-only on the server too.
- Dark mode now also darkens date pickers and other form controls.

### `feature` — Login + admin account
- **First-time setup page** (`/setup`): creates the admin account when there
  are no users yet; closed for good once an account exists.
- **Login page** (`/login`) with email + password. Passwords are hashed with
  bcrypt. Wrong email and wrong password give the same message and take the
  same time, so the page doesn't reveal which emails exist.
- **Login cookie**: signed (HS256, `SESSION_SECRET`), HTTP-only, SameSite=Lax,
  secure in production, lasts 7 days. Changed or expired cookies are rejected.
- **All other pages need a login**: middleware sends logged-out visitors to
  `/login`; pages also check the account still exists (`requireUser`).
  `requireAdmin` is ready for admin-only pages.
- **Header** with the user's name and a **Log out** button.
- **Password reset command**: `npm run user:reset-password`.
- Forms keep the typed name/email after an error (passwords are cleared).
- New setting `SESSION_SECRET` in `.env.example`; README explains login and setup.
- `package.json` now requires Node.js 20.19+ (`engines`, `.npmrc`, `.nvmrc`). Older
  versions fail to build Tailwind with `ERR_REQUIRE_ESM`; `npm install` now says so clearly.
- The home page now greets the logged-in user (the database check page was removed).

### `setup` — Project setup
- Created the Next.js 15 app (App Router, TypeScript, React 19) with Tailwind CSS 4 and ESLint.
- Added Prisma 6 with PostgreSQL and the full data model from the plan:
  User, Project, LearningPath, LearningStep, Task, RecurringTask, TimeLog
  (plus Role, ProjectStatus, TaskStatus, Priority and RecurrenceRule options).
- Added the first database migration (`prisma/migrations/..._init`).
- Added `docker-compose.yml` (local Postgres 16) and `.env.example`.
- Added a home page that shows whether the database is connected.
- Added scripts: `typecheck`, `db:migrate`, `db:deploy`, `db:studio`.
- Updated `README.md` with setup steps, scripts and project layout.

### `docs` — Project plan
- Added `README.md`, `docs/PLAN.md` (features, tech stack, data model, build order)
  and `docs/WORKFLOW.md` (approval, branches, labels, documentation rules).
