# StrainScout MD — Claude Persistent Context

## Session Start Protocol

**BEFORE taking any action, run `/orchestrator` to initialize the session.**
Do not propose, plan, research, or modify anything until the orchestrator has run.
This applies to every session without exception.

---

## What This Project Is

StrainScout MD is a Maryland cannabis strain price comparison website. Users find the
cheapest flower, compare dispensaries, and track prices across 98+ Maryland dispensaries.
Primary audience: price-sensitive Maryland cannabis consumers, primarily on mobile.

The project has two web frontends:
- `web/` — React 19 + Vite + Express + tRPC (active development)
- `web_2/` — Next.js static export (production build, deployed to IONOS)

The data pipeline (`run_all.py`) scrapes dispensary menus, processes and enriches the
data, and publishes a static catalog JSON to IONOS hosting.

---

## My Behavior Rules

- **Always confirm before editing files.** State what I plan to change and why, first.
- **Read this file at the start of every session** before making any suggestions.
- **Never start a hooks, pipeline, or deploy workflow** unless explicitly asked.
- **Transparency first:** if unsure about intent, ask before acting.
- **Route through specialist agents** — use `/engineer` for code changes, `/qa-agent`
  after changes, `/ux-agent` for UI/UX decisions, `/security-agent` for security review.

---

## Architecture Decisions (do not change without discussion)

- **Catalog data** is served as static JSON from CDN (`strainscout_catalog_v10.min.json`).
  Not from the database. This is intentional for performance.
- **Dynamic data** (alerts, comments, votes, partners) via tRPC at `/api/trpc`.
- **Auth** uses HTTP-only cookies + Supabase. `useAuth.ts` is currently a stub —
  real OAuth is not yet wired up. Do not build features that depend on auth until resolved.
- **Design system:** "Botanical Data Lab" — dark emerald base, cream text, amber CTAs.
  Fonts: DM Serif Display (headlines), Space Grotesk (body), JetBrains Mono (prices).
- **Backend:** Express + Drizzle ORM + better-sqlite3 locally, Supabase in production.
- **Deploy:** IONOS static hosting via `python3 -m publish.upload_ionos --next-incremental`.
  **Deploy only on Wednesday mornings.**
- **Data pipeline:** Runs every Tuesday. Entry point: `python run_all.py`.

---

## Known Stubs & Legacy Artifacts

- `web/client/src/hooks/useAuth.ts` — always returns null user. Auth is non-functional.
- `web/client/src/pages/Account.tsx` — placeholder shell, all features show "coming soon."
- `web/client/src/components/AIChatBox.tsx` — unknown status, may be unwired.
- `web/client/src/components/ManusDialog.tsx` — likely legacy OAuth artifact.
- `.claude/hooks/session-start.sh` — created during a skills workflow; not registered
  in settings.json; safe to ignore or remove.

---

## Agent System

Five specialist agents are available as slash commands:

| Command | Role |
|---------|------|
| `/orchestrator` | Session lead — reads context, routes tasks, never modifies code |
| `/engineer` | Implements code changes as directed |
| `/qa-agent` | Enforces quality standards after each change phase |
| `/security-agent` | Reviews security implications, enforces OWASP/CSP |
| `/ux-agent` | Enforces UX standards and user journey quality |

Reference memory files:
- `.claude/memory/qa_standards.md`
- `.claude/memory/security_standards.md`
- `.claude/memory/ux_standards.md`

---

## Branch & Deploy Workflow

- Feature branches: `feature/[issue-name]`
- Staging merges: Tuesdays & Fridays
- **Production deploy: Wednesdays only**
- Current development branch: `claude/learn-web-dev-skills-sqguq`
- Never push directly to `main`.
