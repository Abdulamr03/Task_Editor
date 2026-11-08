# Changelog

All changes to this project are listed here, newest first.
Each entry names the pull request label.

## Unreleased

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
