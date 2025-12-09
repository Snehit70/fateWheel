# Roulette Game

A full-stack Roulette application built with Vue.js (Frontend) and Node.js/Express (Backend).

## Quick Start

1.  **Start the Application**:

    ```bash
    ./run.sh
    ```

    **Windows (PowerShell)**:

    ```powershell
    .\run.ps1
    ```

    This will:
    - Check/Start MongoDB (requires Docker Desktop on Windows)
    - Start the Backend (Port 3000)
    - Start the Frontend (Port 5173)
    - Show a status report with URLs

2.  **Stop the Application**:
    ```bash
    ./stop.sh
    ```

## Features

- Real-time betting and game loop
- User authentication
- Admin panel for user management
- Secure random number generation

## Requirements

- Node.js & npm
- Podman (for MongoDB)

## Environment Variables

To set up the project, create `.env` files in the `client` and `server` directories using the values below.

### Client (`client/.env`)

| Variable                        | Default Value               | Description                         |
| :------------------------------ | :-------------------------- | :---------------------------------- |
| `VITE_API_URL`                  | `http://localhost:3000/api` | API Base URL                        |
| `VITE_SOCKET_URL`               | `http://localhost:3000`     | Socket.io URL                       |
| `VITE_MIN_BET_AMOUNT`           | `11`                        | Minimum allowed bet amount          |
| `VITE_MAX_BET_AMOUNT`           | `1001`                      | Maximum allowed bet amount          |
| `VITE_PAYOUT_NUMBER`            | `14`                        | Payout multiplier for single number |
| `VITE_PAYOUT_COLOR`             | `2`                         | Payout multiplier for colors        |
| `VITE_PAYOUT_TYPE`              | `2`                         | Payout multiplier for Even/Odd      |
| `VITE_GAME_WAITING_TIME`        | `20`                        | Phase duration (seconds)            |
| `VITE_GAME_SPIN_DURATION`       | `5`                         | Phase duration (seconds)            |
| `VITE_GAME_RESULT_DURATION`     | `5`                         | Phase duration (seconds)            |
| `VITE_ANIMATION_ROTATION_SPEED` | `15`                        | Wheel rotation speed factor         |
| `VITE_ANIMATION_EXTRA_SPINS`    | `5`                         | Number of extra spins               |

### Server (`server/.env`)

| Variable                     | Default Value                        | Description                        |
| :--------------------------- | :----------------------------------- | :--------------------------------- |
| `PORT`                       | `3000`                               | Server Port                        |
| `MONGODB_URI`                | `mongodb://127.0.0.1:27017/roulette` | MongoDB Connection String          |
| `JWT_SECRET`                 | _(Required)_                         | Secret key for JWT signing         |
| `CLIENT_URL`                 | `http://localhost:5173`              | Allowed Origin for CORS            |
| `MAX_BET_AMOUNT`             | `1001`                               | Server-side max bet validation     |
| `PAYOUT_NUMBER`              | `14`                                 | Server-side payout calc (Number)   |
| `PAYOUT_COLOR`               | `2`                                  | Server-side payout calc (Color)    |
| `PAYOUT_TYPE`                | `2`                                  | Server-side payout calc (Even/Odd) |
| `GAME_WAITING_TIME`          | `20`                                 | Phase duration (seconds)           |
| `GAME_SPIN_DURATION`         | `5`                                  | Phase duration (seconds)           |
| `GAME_RESULT_DURATION`       | `5`                                  | Phase duration (seconds)           |
| `AUTH_RATE_LIMIT_WINDOW_MS`  | `900000`                             | Auth rate limit window (15 mins)   |
| `AUTH_RATE_LIMIT_MAX`        | `1000`                               | Max auth requests per window       |
| `SOCKET_RATE_LIMIT_POINTS`   | `5`                                  | Max socket events per second       |
| `TIMESYNC_RATE_LIMIT_POINTS` | `10`                                 | Max time sync requests per second  |
