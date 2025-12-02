#!/bin/bash

# Define log files
BACKEND_LOG="backend.log"
FRONTEND_LOG="frontend.log"
PIDS_FILE="$(pwd)/.pids"

# Clear previous logs and pids
> $BACKEND_LOG
> $FRONTEND_LOG
> "$PIDS_FILE"

# Check and start MongoDB
if ! podman ps | grep -q mongodb; then
    echo "MongoDB is not running. Attempting to start..."
    if podman ps -a | grep -q mongodb; then
        podman start mongodb
        echo "MongoDB started."
    else
        echo "Error: MongoDB container 'mongodb' not found. Please create it first."
        exit 1
    fi
    # Wait a moment for DB to be ready
    sleep 2
fi

echo "Starting backend..."
cd server
# Start backend in background, redirect output to log
npm run dev > ../$BACKEND_LOG 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> "$PIDS_FILE"
cd ..

echo "Starting frontend..."
# Start frontend in background, redirect output to log
npm run dev > $FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> "$PIDS_FILE"

# Wait for services to initialize
echo "Waiting for services to initialize..."
sleep 5

# Function to check if a port is listening
check_port() {
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
printf "%-15s %-10b %-10s %-30s\n" "Frontend" "$(check_port 5173)" "5173" "http://localhost:5173"
printf "%-15s %-10b %-10s %-30s\n" "Backend" "$(check_port 3000)" "3000" "http://localhost:3000"
printf "%-15s %-10b %-10s %-30s\n" "Database" "$(check_port 27017)" "27017" "mongodb://127.0.0.1:27017"
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
echo "Admin Credentials:"
echo "Username: admin"
echo "Password: adminpassword123"
echo "=================================================="
echo ""
echo "Logs available at: $BACKEND_LOG and $FRONTEND_LOG"
echo "Use ./stop.sh to stop the application."

