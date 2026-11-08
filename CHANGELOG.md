# Changelog

All changes to this project are listed here, newest first.
Each entry names the pull request label.

## Unreleased

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
