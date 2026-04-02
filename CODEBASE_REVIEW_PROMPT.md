Review this codebase like a senior engineer performing a production-readiness and risk-focused review.

Repository context:
- This is a full-stack roulette application.
- Frontend: Vue 3 + Vite + Pinia in `/home/snehit/projects/roulette/client/src`
- Backend: Node.js + Express + TypeScript + Socket.IO + MongoDB + Redis in `/home/snehit/projects/roulette/server`
- Core domains: authentication, role-based admin flows, betting, game loop timing, real-time state sync, payout logic, history/logging, and rate limiting

Primary review goals:
1. Find correctness bugs, race conditions, state-sync issues, security problems, and production risks.
2. Identify architectural weaknesses that could cause data inconsistency, double-processing, payout errors, or broken multiplayer behavior.
3. Call out missing tests or weak test coverage in high-risk areas.
4. Suggest the smallest high-leverage fixes first.

Focus especially on these areas:
- `/home/snehit/projects/roulette/server/index.ts`
- `/home/snehit/projects/roulette/server/game/GameLoop.ts`
- `/home/snehit/projects/roulette/server/services/socketService.ts`
- `/home/snehit/projects/roulette/server/routes`
- `/home/snehit/projects/roulette/server/middleware`
- `/home/snehit/projects/roulette/server/models`
- `/home/snehit/projects/roulette/server/redis`
- `/home/snehit/projects/roulette/server/utils`
- `/home/snehit/projects/roulette/server/tests`
- `/home/snehit/projects/roulette/client/src/stores`
- `/home/snehit/projects/roulette/client/src/services`
- `/home/snehit/projects/roulette/client/src/composables`
- `/home/snehit/projects/roulette/client/src/views`
- `/home/snehit/projects/roulette/client/src/components`

De-prioritize or ignore:
- Build artifacts such as `/home/snehit/projects/roulette/server/dist`
- Dependency folders such as `node_modules`
- Generated logs
- Secrets in `.env` files; mention security exposure if relevant, but do not print secrets

Review lens:
- Security: auth, JWT handling, admin authorization, validation, rate limiting, CORS, socket auth, secret handling
- Data integrity: balance updates, refunds, payouts, idempotency, atomicity, transaction safety
- Real-time behavior: socket lifecycle, reconnection, duplicate events, leader election, Redis pub/sub consistency
- Game correctness: round transitions, timers, result calculation, historical persistence, crash recovery
- Reliability: startup/shutdown behavior, connection error handling, retries, cleanup, observability
- Frontend correctness: stale state, auth/session handling, socket lifecycle, optimistic UI bugs, admin-only access leaks
- Testing: missing cases around concurrent bets, crash recovery, duplicate submissions, authorization boundaries, payout edge cases
- Maintainability: hidden coupling, unclear ownership of state, dangerous duplication between client/server constants

How to work:
1. Read the README and package manifests to understand runtime and scripts.
2. Map the request/response and realtime data flow between frontend, backend, MongoDB, Redis, and Socket.IO.
3. Review the backend first, since it contains the highest-risk business logic.
4. Then review the frontend for mismatches with backend guarantees and for state-management issues.
5. Infer intended behavior from tests, then note where tests are missing or insufficient.

Output requirements:
- Findings first, ordered by severity.
- For each finding, include:
  - Severity: `critical`, `high`, `medium`, or `low`
  - Why it matters
  - Evidence with file references and line numbers when possible
  - A concrete fix recommendation
- After findings, include:
  - `Open Questions`
  - `Missing Tests`
  - `Quick Wins`
- Keep the summary brief. The value is in the findings, not a long overview.

Important review rules:
- Do not praise by default.
- Do not produce a generic style audit unless it affects correctness, security, performance, or maintainability.
- Prefer concrete, repo-specific findings over broad best-practice advice.
- If you are unsure, say so and mark it as an inference.
- If no serious issues are found, say that explicitly and list residual risks.
