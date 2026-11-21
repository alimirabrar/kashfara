# Kashfara CRM — Plan

## Goal and users
A super-admin CRM "Control Room" for the Kashfara team: onboarded members sign in with the secured PIN **1944** and their name, then manage daily tasks, daily updates, current leads and current projects, with a Groq-powered AI command rail that creates leads, opens projects, updates tasks and answers questions. Working = the preview shows a live dashboard backed by Postgres where every create/update round-trips the database, and the AI rail performs real mutations when a Groq key is present.

## Scope
In scope: PIN + member-profile auth; dashboard with KPI strip (active leads, active projects, tasks done/open, updates logged today); daily task board (owner, status, priority, due); daily updates feed; leads, projects, members screens with full CRUD APIs; Groq AI chat rail with tool-calling mutations; bright "Precision Operations" theme.
Out of scope (for now): multi-tenant orgs, email notifications, file uploads, dark theme toggle (design brief selects bright), per-member permissions beyond admin flag.

## Architecture
- Next.js (App Router, TypeScript) — one repo, server components + route handlers; deploy on Vercel.
- Postgres + Drizzle ORM — local Postgres in dev (`DATABASE_URL`), Neon/Supabase-compatible in prod; migrations via drizzle-kit.
- Auth: PIN `1944` verified server-side, then the member picks (or creates) their profile; session = signed httpOnly cookie (`kashfara_session`), middleware guards all pages/APIs except `/enter` and auth APIs. Super-admin = `role: 'admin'` flag on members.
- Data model: `members` (name, title, contact, role, point of contact), `leads` (name, company, status, value, owner), `projects` (name, client, status, owner, due), `tasks` (title, assignee, project, status, priority, due), `daily_updates` (member, body, logged date), `ai_events` (audit of AI mutations).
- APIs: `/api/auth/enter`, `/api/auth/me|logout`, `/api/members`, `/api/leads`, `/api/projects`, `/api/tasks`, `/api/updates`, `/api/kpis`, `/api/ai/chat` (Groq tool-calling; key read from `GROQ_API_KEY` server-side only, graceful disabled state without it).
- UI: one token system (bg #F6F7F4, text #16211C, accent #0E7C5A, radius 10, Inter + display weight scale), dashboard layout: left nav, KPI strip top, task board center, right-rail AI assistant persistent.

## Risks and assumptions
- `GROQ_API_KEY` is not in this workspace's Vault yet; AI mutations are fully implemented and will activate once the key is provided. UI shows a clear "key needed" state meanwhile.
- Single shared PIN is the accepted security model per the brief (PIN-secured access).
- Seed data lives in `src/db/seed.ts` only; the UI never ships hardcoded arrays.

## Phase 1: Thin vertical slice — auth + tasks round-trip
- [x] Next.js + Drizzle scaffold, Postgres schema, migrations
- [x] PIN 1944 entry + member profile selection, signed session cookie, middleware guard
- [x] Tasks + updates + members APIs (validated, real DB)
- [x] Dashboard: KPI strip, daily task board with status changes, daily updates feed posting to DB
- Acceptance: from the preview, enter PIN 1944, pick a member, see seeded KPIs, change a task status and post an update; after reload both persist.

## Phase 2: Leads, projects and members screens
- [x] Leads board with statuses and values; Projects list with owners and due dates; Members directory with point-of-contact details
- [x] Full CRUD APIs wired to the UI, loading/empty/error states
- Acceptance: create a lead, project and member from the UI and see them after reload.

## Phase 3: Groq AI command rail
- [x] `/api/ai/chat` with Groq tool-calling: createLead, createProject, createTask, updateTaskStatus, logUpdate, getKpis
- [x] Persistent right-rail chat, executes tools against real APIs, audit log in `ai_events`
- Acceptance: "Create a lead Acme Corp worth 5000" creates a real lead visible on the leads board (works once GROQ_API_KEY is set; UI shows key-needed state without it).

## Phase 4: Polish and verification
- [x] Mobile layout at 360 px, focus states, skeletons, reduced motion, browser checks at 390/1280
- [x] Production build passes
- Acceptance: build green, no horizontal overflow, main flow works on phone and desktop widths.
