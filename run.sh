#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Define log files
LOGS_DIR="logs"
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"
PIDS_FILE="$LOGS_DIR/.pids"

# Create logs directory if it doesn't exist
mkdir -p "$LOGS_DIR"

# Clear previous logs and pids
>$BACKEND_LOG
>$FRONTEND_LOG
>$PIDS_FILE

# Dependency Check
for cmd in npm node lsof podman; do
  if ! command -v $cmd &>/dev/null; then
    echo -e "\e[31mError: Required command '$cmd' is not installed.\e[0m"
    exit 1
  fi
done

# Port Check
check_port_free() {
  if lsof -i:$1 -t >/dev/null; then
    echo -e "\e[31mError: Port $1 is already in use.\e[0m"
    return 1
  fi
  return 0
}

if ! check_port_free 3000 || ! check_port_free 5173; then
  echo "Please stop the running services or free up the ports before starting."
  exit 1
fi

# Check and start MongoDB
if ! podman ps | grep -q mongodb; then
  echo "MongoDB is not running. Attempting to start..."
  if podman ps -a | grep -q mongodb; then
    podman start mongodb
    echo "MongoDB started."
  else
    echo "MongoDB container not found. Creating and starting..."
    podman run -d --name mongodb -p 27017:27017 mongo:latest
    echo "MongoDB created and started."
  fi
  # Wait a moment for DB to be ready
  sleep 2
fi

# Seed Admin User
echo "Checking/Seeding Admin User..."
cd server
if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo "Error: ADMIN_USERNAME and ADMIN_PASSWORD must be set."
  exit 1
fi
export ADMIN_USERNAME
export ADMIN_PASSWORD
npm run seed:admin
if [ $? -eq 0 ]; then
  echo "Admin user check completed."
else
  echo "Error seeding admin user."
  # We don't exit here because the app might still work, but it's good to know
fi

# Run Tests
echo ""
echo "Running tests..."
npm test
if [ $? -eq 0 ]; then
  echo -e "\e[32mAll tests passed!\e[0m"
else
  echo -e "\e[33mWarning: Some tests failed. Check output above.\e[0m"
fi
echo ""

cd ..

echo "Starting backend..."
cd server
# Start backend in background, redirect output to log
npm run dev >../$BACKEND_LOG 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >>"../$PIDS_FILE"
cd ..

echo "Starting frontend..."
cd client
# Start frontend in background, redirect output to log
npm run dev >../$FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >>"../$PIDS_FILE"
cd ..

# Smart Wait for services
echo "Waiting for services to initialize..."
TIMEOUT=30
COUNT=0
BACKEND_READY=false
FRONTEND_READY=false

while [ $COUNT -lt $TIMEOUT ]; do
  if ! $BACKEND_READY && lsof -i:3000 -t >/dev/null; then
    BACKEND_READY=true
    echo -e "\e[32mBackend is ready on port 3000.\e[0m"
  fi

  if ! $FRONTEND_READY && lsof -i:5173 -t >/dev/null; then
    FRONTEND_READY=true
    echo -e "\e[32mFrontend is ready on port 5173.\e[0m"
  fi

  if $BACKEND_READY && $FRONTEND_READY; then
    break
  fi

  sleep 1
  ((COUNT++))
done

if ! $BACKEND_READY || ! $FRONTEND_READY; then
  echo -e "\e[31mWarning: One or more services failed to start within $TIMEOUT seconds.\e[0m"
  echo "Check logs for details: $BACKEND_LOG, $FRONTEND_LOG"
fi

# Function to check if a port is listening (for status report)
check_port_status() {
  if lsof -i:$1 -t >/dev/null; then
    echo -e "\e[32mRunning\e[0m"
  else
    echo -e "\e[31mStopped\e[0m"
  fi
}

echo ""
echo "=================================================="
echo "           APPLICATION STATUS REPORT              "
echo "=================================================="
echo ""
printf "%-15s %-10s %-10s %-30s\n" "SERVICE" "STATUS" "PORT" "URL"
printf "%-15s %-10s %-10s %-30s\n" "-------" "------" "----" "---"
printf "%-15s %-10b %-10s %-30s\n" "Frontend" "$(check_port_status 5173)" "5173" "http://localhost:5173"
printf "%-15s %-10b %-10s %-30s\n" "Backend" "$(check_port_status 3000)" "3000" "http://localhost:3000"
printf "%-15s %-10b %-10s %-30s\n" "Database" "$(check_port_status 27017)" "27017" "mongodb://127.0.0.1:27017"
echo ""
echo "=================================================="
echo "              AVAILABLE API ROUTES                "
echo "=================================================="
echo ""
echo "Auth:"
echo "  POST /api/auth/register"
echo "  POST /api/auth/login"
echo "  GET  /api/auth/me"
echo ""
echo "Game:"
echo "  GET  /api/game/history"
echo "  GET  /api/game/stats"
echo ""
echo "Admin:"
echo "  GET  /api/admin/users"
echo "  PUT  /api/admin/users/:id/balance"
echo ""
echo "=================================================="
echo "Admin credentials are configured via environment."
echo "=================================================="
echo ""
echo "Logs available at: $BACKEND_LOG and $FRONTEND_LOG"
echo "Use ./stop.sh to stop the application."
