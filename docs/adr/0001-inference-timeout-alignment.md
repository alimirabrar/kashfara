# ADR 0001: Align serverless inference time budget with function maxDuration

Date: 2026-11-21
Status: Accepted
Scope: error-behaviour fix only; no UI or architecture change.

## Context

KASHFARA VISION is deployed on Vercel as serverless functions. The demo
endpoints that call the LLM (`/api/documents/process`,
`/api/documents/[id]/qa`) declare `maxDuration = 60` seconds.

Production evidence (live probes against kashfara.com, 2026-11-21):

- `POST /api/documents/[id]/qa` returned **HTTP 504** after exactly 60s —
  Vercel killed the function and returned an HTML gateway error page.
- `POST /api/documents/process` returned 200 only after **55.6s**, of which
  the recorded extraction step was 6.9s; ~49s was a first model attempt
  hanging until abort.

Root cause in code:

- `src/services/ai/inference-orchestrator.ts` used an internal time budget
  of **100s** (`Date.now() - startedAt > 100_000`), larger than the 60s
  function limit.
- `src/services/ai/gemini-provider.ts` used a fixed **50s per-attempt**
  `AbortSignal.timeout(50_000)`, so a single hung upstream attempt consumed
  the whole function budget, leaving the retry no room.

Secondary defect: when the function 504s, the response body is HTML, and the
demo client's `res.json()` threw `SyntaxError: Unexpected token '<'` in the
browser console instead of surfacing the timeout.

## Options considered

1. **Raise `maxDuration` (e.g. 300s) on the routes.** Keeps the large
   internal budget, but longer functions mean slower failure for users,
   higher execution cost, and it masks the hung-attempt problem rather than
   bounding it. Rejected.
2. **Bound all inference inside the function limit (chosen).** Shrink the
   orchestrator budget to 45s and make each attempt's timeout depend on the
   remaining budget (cap 30s, minimum 5s reserve). The retry chain then
   always fits inside 60s: worst case the API returns its structured error
   JSON instead of the function being killed.
3. **Move processing to a background queue/job endpoint.** Correct at larger
   scale but changes the architecture (state, polling, UI flow) — out of
   scope for an error fix.

## Decision

Option 2, plus a safe client-side parse:

- Orchestrator: `TIME_BUDGET_MS = 45_000`; each attempt passes
  `timeoutMs = min(30_000, remaining - 2_000)`; attempts stop when fewer
  than 5s remain.
- `GeminiProvider.chatCompletion` accepts an optional `timeoutMs` (default
  30s) used in `AbortSignal.timeout`.
- New `src/lib/api-response.ts` (`parseApiResponse`) parses the body as text
  first and falls back to `{ error: "Server error (HTTP <status>)" }` when
  the body is not JSON; all demo components use it.

## Consequences

- A hung upstream attempt now fails fast; the retry (or the next model)
  still runs inside the function limit.
- The worst-case `/process` latency drops from ~56s to ≤~47s; `/qa` no
  longer 504s on a hung first attempt — it either answers or returns a
  structured error.
- Trade-off: extremely slow *legitimate* upstream responses beyond ~30s per
  attempt are now aborted earlier than before. Acceptable: the previous
  behaviour was a 504 with no answer at all.
- Client shows a readable server-error message instead of a JSON parse
  exception.

## Verification

- `npm run build` passes (all routes compiled).
- Local production server: `/api/health` 200; process/QA return structured
  503 errors without a key (no crash).
- Playwright check of `/demo` at 1280px: zero page errors, zero console
  errors, zero network failures, page interactive.
- Pre-fix live repro recorded: `/qa` → 504 at 60s on kashfara.com.
