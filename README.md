# Task Editor

A personal web app to track daily tasks, learning paths and projects — with an
admin login to edit everything from the browser, and PDF export of chosen
tasks and progress.

> Status: setup and login done. Projects, learning paths and tasks come next — see the [build order](docs/PLAN.md#build-order-one-labelled-pull-request-each).

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
- **Forgot your password?** Reset it from the terminal:
  ```bash
  npm run user:reset-password
  ```
  It asks for the email and a new password. The password is visible while you type it.

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
src/app/login/         Login page and log in / log out actions
src/app/setup/         First-time admin account page
src/components/        Shared UI pieces
src/lib/db.ts          Shared database client
src/lib/session.ts     Login cookie (signed, HTTP-only, 7 days)
src/lib/auth.ts        Password hashing, requireUser / requireAdmin
src/middleware.ts      Sends logged-out visitors to /login
scripts/               Command-line helpers (password reset)
docker-compose.yml     Local PostgreSQL
```

## Documentation

- [Project plan](docs/PLAN.md) — features, tech stack, data model, build order
- [Workflow](docs/WORKFLOW.md) — how changes are proposed, approved and labelled
- [Changelog](CHANGELOG.md) — every change, newest first
