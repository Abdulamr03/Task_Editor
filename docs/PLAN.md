# Project Plan — Task Editor

A personal web app to track daily tasks, learning-path progress and project
progress. Everything is managed from the browser by a logged-in admin — no code
changes needed to add or edit projects, learning paths or tasks.

## Goals

- See what to do **today**, across all projects and learning paths.
- Track **progress** of every project and learning path.
- **Edit everything from the web app** (admin user).
- **Export PDFs** of chosen tasks, projects and learning paths.
- Be **hostable online** later (e.g. Vercel + Neon PostgreSQL).

## Tech stack

| Part | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Frontend and backend in one app; easy to host on Vercel |
| Styling | Tailwind CSS | Fast, consistent UI |
| Database | PostgreSQL via Prisma | Works the same locally and when hosted |
| Auth | Email + password login, hashed passwords, secure session cookie | Simple, no external service needed |
| PDF | Server-side PDF generation | Download a ready PDF from the browser |
| Hosting (later) | Vercel (app) + Neon (free Postgres) | Free tiers, no server to manage |

## Features

### Core (requested)
1. **Login** — admin account; all pages require login.
2. **Projects** — create / edit / archive; status, deadline, description,
   progress bar from finished tasks.
3. **Learning paths** — each path has ordered steps (course, chapter, book…)
   you tick off; progress percentage.
4. **Daily tasks** — "Today" view; add, edit, complete tasks; link a task to a
   project or learning path.
5. **PDF export** — pick date range, projects, learning paths and sections
   (tasks, completed work, progress, notes) → download PDF.

### Additional (agreed)
6. **Recurring tasks** — daily or weekdays; appear on Today automatically.
7. **Carry over** — move unfinished tasks to the next day in one click.
8. **Dashboard** — today, overdue, progress bars, streak, hours this week.
9. **Time log** — minutes spent per project / learning path, weekly totals.
10. **Notes & resource links** on projects and learning-path steps.
11. **Priority, time estimate, search and filters** for tasks.
12. **History / calendar view** — what was done on any past day.
13. **Backup** — export / import all data as JSON.
14. **Viewer role (optional)** — read-only account to share progress.

## Data model (first draft)

- **User** — name, email, password hash, role (`ADMIN` / `VIEWER`)
- **Project** — name, description, status (`ACTIVE` / `PAUSED` / `DONE` / `ARCHIVED`), color, start date, due date, notes
- **LearningPath** — title, description, status, color, notes
- **LearningStep** — belongs to a learning path; title, order, done, done date, resource link, notes
- **Task** — title, notes, date, status (`TODO` / `IN_PROGRESS` / `DONE`), priority, estimate (minutes), completed at, optional project, optional learning path
- **RecurringTask** — template (title, rule `DAILY` / `WEEKDAYS`, project / learning path) that creates Tasks
- **TimeLog** — date, minutes, note, optional project / learning path

## Build order (one labelled pull request each)

| # | Pull request | Label |
|---|---|---|
| 0 | Project plan, docs, changelog (this) | `docs` |
| 1 | Project setup (Next.js, Tailwind, Prisma, Postgres) | `setup` |
| 2 | Login + admin account | `feature` |
| 3 | Projects | `feature` |
| 4 | Learning paths | `feature` |
| 5 | Daily tasks + recurring tasks + carry over | `feature` |
| 6 | Dashboard | `feature` |
| 7 | Time log | `feature` |
| 8 | PDF export | `feature` |
| 9 | Backup (JSON export/import) | `feature` |
| 10 | Hosting guide (Vercel + Neon) | `docs` |

See [WORKFLOW.md](WORKFLOW.md) for how every change is proposed, approved and labelled.
