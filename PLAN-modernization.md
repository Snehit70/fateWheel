# FateWheel Modernization Plan

> Saved locally for reference across sessions. Not tracked in git.

## Current State (Jan 2026)

**Stack:** Express + MongoDB + Socket.io (Node.js) / Vue 3 + Pinia + TailwindCSS + shadcn-vue
**Issues:** Admin approval bloat, no horizontal scaling, no TypeScript, monolithic server, local-only deployment

---

## Phase 1: Simplify & Clean (1-2 days)

**Goal:** Remove admin bloat, simplify auth, make game immediately playable.

### Server Changes

- `server/models/User.js` — Remove `status` enum (pending/rejected), remove `allowPasswordReset` field. Keep: username, password, balance, role, createdAt.
- `server/routes/auth.js` — Auto-approve on register. Remove `reset-password` endpoint. Remove status checks on login (no more pending/rejected blocks).
- `server/routes/admin.js` — Remove: `PUT /users/:id/status`, `PUT /users/:id/allow-reset`. Simplify `DELETE /users/:id` to only allow self-delete or cleanup. Keep: GET users, GET stats, PUT balance, GET logs, GET rounds, POST withdraw, GET withdrawals.
- `server/models/AdminLog.js` — Remove `approve_user`, `reject_user`, `toggle_reset` from action enum.
- `server/index.js` — Rename "Roulette Server" to "FateWheel Server". Update DB name from `roulette` to `fatewheel`.
- `server/game/GameLoop.js` — No core logic changes.

### Client Changes

- `client/src/components/LoginModal.vue` — Remove "Forgot Password" flow entirely.
- `client/src/components/TopBar.vue` — Rename "PROBABILITY" to "FATEWHEEL".
- `client/src/components/StatusBanner.vue` — Remove or simplify (no more pending/rejected states).
- `client/src/views/Admin.vue` — Remove status Select, remove allowPasswordReset toggle, remove Delete button for non-pending. Show status as simple badge.
- `client/src/App.vue` — Remove pending/rejected toast watchers.
- `client/src/router/index.js` — Update page titles from "Roulette" to "FateWheel".
- `server/seedAdmin.js` — Update to work without status field.

---

## Phase 2: Redis Integration for Scaling (3-4 days)

**Goal:** Horizontal scaling with Redis-backed game state + pub/sub.

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Server #1   │     │  Server #2   │     │  Server #3   │
│  (Leader)    │     │  (Follower)  │     │  (Follower)  │
│  Game Loop ✓ │     │  Socket.io   │     │  Socket.io   │
│  Socket.io   │     │  REST API    │     │  REST API    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       └────────────┬───────┴─────────────────────┘
                    │
              ┌─────┴─────┐
              │   Redis    │
              │  State     │
              │  PubSub    │
              │  Leader    │
              └────────────┘
```

### New Files
- `server/redis/redisClient.js` — Redis connection singleton
- `server/redis/gameState.js` — Game state store (hashes, lists)
- `server/redis/pubsub.js` — Redis pub/sub for broadcasting
- `server/redis/leader.js` — Leader election (SET NX EX)

### Modified Files
- `server/game/GameLoop.js` — Read/write state to Redis, publish changes
- `server/services/socketService.js` — Subscribe to Redis pub/sub, broadcast locally
- `server/index.js` — Redis init, leader election, Socket.io Redis adapter

### Redis Schema
```
game:state          → Hash {state, endTime, currentRoundId, roundNumber, result}
game:bets:current   → Hash {userId:type:value → {amount, username}}
game:history        → Capped List (15 items)
game:leader         → Key with TTL (leader lock)
```

---

## Phase 3: TypeScript Migration (3-4 days)

**Goal:** Type safety across the server.

- Convert all server files `.js` → `.ts`
- Type game constants with `as const`
- Type Mongoose models with interfaces
- Type Socket.io events
- Type Express routes
- Add `tsconfig.json`, `typescript`, `tsx`, `@types/*` deps

---

## Phase 4: Frontend Modernization (2-3 days)

**Goal:** Cleaner socket lifecycle, better state management, polished UX.

- Centralize socket in Pinia store (remove scattered socket.on/off)
- Create `useSocket()` composable
- Add connection status indicator
- Auto-reconnect with state recovery
- Better loading/error states, skeleton screens
- Simplify admin views post-Phase-1
- Mobile UX polish

---

## Phase 5: Game Enhancements (2-3 days)

**Goal:** Make it a real game worth playing.

- Live player count ("X players betting")
- Hot/cold numbers from recent history
- Bet leaderboard (top bets this round)
- Better sound effects (bet, spin, win, lose)
- Win celebration (confetti on big wins)
- Variable timing (configurable round duration)
- Jackpot/multiplier rounds

---

## Phase 6: Deployment & Infrastructure (1-2 days)

**Goal:** Production-ready deployment.

- Docker Compose (server × 2, Redis, MongoDB)
- Health checks (`/health` with Redis + DB ping)
- Graceful shutdown (drain sockets, release leader lock)
- `.env` templates for production
- Nginx reverse proxy config with WebSocket support
- Basic monitoring (Prometheus metrics or structured logs)

---

## Timeline Summary

| Phase | Focus | Duration | Risk |
|-------|-------|----------|------|
| 1 | Simplify & Clean | 1-2 days | 🟢 Low |
| 2 | Redis Scaling | 3-4 days | 🔴 High |
| 3 | TypeScript | 3-4 days | 🟡 Medium |
| 4 | Frontend | 2-3 days | 🟢 Low |
| 5 | Game Features | 2-3 days | 🟡 Medium |
| 6 | Deployment | 1-2 days | 🟢 Low |

**Total: ~12-18 days**
