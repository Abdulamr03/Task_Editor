# Task Editor

A personal web app to track daily tasks, learning paths and projects — with an
admin login to edit everything from the browser, and PDF export of chosen
tasks and progress.

> Status: project setup done (Next.js, Tailwind, Prisma, PostgreSQL). Features come next — see the [build order](docs/PLAN.md#build-order-one-labelled-pull-request-each).

## Run it locally

You need **Node.js 20+** and either **Docker** or your own **PostgreSQL 16** database.

1. Install packages:
   ```bash
   npm install
   ```
2. Start the database (skip if you use your own Postgres):
   ```bash
   docker compose up -d
   ```
3. Create your settings file, then edit `DATABASE_URL` if you use your own database:
   ```bash
   cp .env.example .env
   ```
4. Create the database tables:
   ```bash
   npm run db:migrate
   ```
5. Start the app and open http://localhost:3000:
   ```bash
   npm run dev
   ```

The home page shows **"Database connected."** when everything works.

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

## Project layout

```
prisma/schema.prisma   Database tables (see data model in docs/PLAN.md)
prisma/migrations/     Database change history
src/app/               Pages (Next.js App Router)
src/lib/db.ts          Shared database client
docker-compose.yml     Local PostgreSQL
```

## Documentation

- [Project plan](docs/PLAN.md) — features, tech stack, data model, build order
- [Workflow](docs/WORKFLOW.md) — how changes are proposed, approved and labelled
- [Changelog](CHANGELOG.md) — every change, newest first
