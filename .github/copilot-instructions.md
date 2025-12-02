# AI Coding Agent Instructions

## Project Overview
This is a real-time multiplayer Roulette game application.
- **Frontend**: Vue 3 (Composition API), Vite, Tailwind CSS v4, Pinia.
- **Backend**: Node.js, Express, Socket.io, Mongoose.
- **Database**: MongoDB (running via Podman).
- **Infrastructure**: Local development managed by shell scripts.

## Architecture & Data Flow
- **Server-Authoritative Game Loop**: The core game logic resides in `server/game/GameLoop.js`. It manages the states (`WAITING`, `SPINNING`, `RESULT`) and broadcasts updates via Socket.io.
- **Real-time Communication**: 
  - Frontend connects via `src/services/socket.js`.
  - Events: `gameState`, `timer`, `spin`, `betPlaced`, `history`.
- **Data Persistence**: User data and balances are stored in MongoDB (`server/models/User.js`).
- **Note on `functions/`**: The `functions/` directory contains Firebase Cloud Functions logic which appears to be separate from the main Node.js game server. **Focus on `server/` for the primary game logic.**

## Development Workflow
- **Startup**: Always use `./run.sh` to start the environment.
  - Checks/starts MongoDB container (podman).
  - Starts Backend (port 3000) and Frontend (Vite).
  - Logs output to `backend.log` and `frontend.log`.
- **Shutdown**: Use `./stop.sh` to kill processes.
- **Debugging**: Check `backend.log` and `frontend.log` for runtime errors.

## Code Conventions
- **Vue Components**: Use `<script setup>` syntax.
- **Styling**: Use Tailwind CSS utility classes.
- **State Management**: Use Pinia stores (`src/stores/`) for global state (Auth) and Composables (`src/composables/`) for game logic.
- **Backend Structure**:
  - `server/index.js`: Entry point, Socket.io setup.
  - `server/routes/`: HTTP API endpoints (Auth, Admin).
  - `server/game/`: Game logic classes.

## Key Files
- `server/game/GameLoop.js`: Controls the roulette timing and logic.
- `src/composables/useGameLogic.js`: Frontend game state handling.
- `src/services/socket.js`: Socket.io client wrapper.
- `run.sh`: Main entry point for development.
