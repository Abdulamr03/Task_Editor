# Workflow

Rules for every change to this repository.

## 1. Explain and approve first

Before any work is pushed, Claude explains **what** will change and **why**,
and waits for the owner's approval.

## 2. One branch + one pull request per change

- Work happens on a branch, never directly on `main`.
- Branch names: `<label>/<short-name>`, e.g. `feature/login`, `docs/project-plan`.
- Each branch is pushed as a **pull request** into `main`.
- The owner reviews and merges the pull request. Nothing reaches `main` without approval.

## 3. Every pull request gets a label

| Label | Meaning |
|---|---|
| `setup` | Project setup, tooling, configuration |
| `feature` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructuring without behavior change |
| `chore` | Maintenance (dependency updates, cleanup) |

## 4. Everything is documented

Every pull request:
- adds an entry to [`CHANGELOG.md`](../CHANGELOG.md),
- updates `README.md` and/or files in `docs/` when behavior or setup changes,
- has a description explaining what changed, why, and how to test it.
