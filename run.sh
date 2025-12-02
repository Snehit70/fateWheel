#!/bin/bash

# Define log files
BACKEND_LOG="backend.log"
FRONTEND_LOG="frontend.log"
PIDS_FILE="$(pwd)/.pids"

# Clear previous logs and pids
> $BACKEND_LOG
> $FRONTEND_LOG
> "$PIDS_FILE"

echo "Starting backend..."
cd server
# Start backend in background, redirect output to log
npm run dev > ../$BACKEND_LOG 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> "$PIDS_FILE"
echo "Backend started with PID $BACKEND_PID (logs: $BACKEND_LOG)"
cd ..

echo "Starting frontend..."
# Start frontend in background, redirect output to log
npm run dev > $FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID >> "$PIDS_FILE"
echo "Frontend started with PID $FRONTEND_PID (logs: $FRONTEND_LOG)"

echo "Application is running."
echo "Use ./stop.sh to stop the application."
echo ""
echo "========================================"
echo "Admin Credentials:"
echo "Username: admin"
echo "Password: adminpassword123"
echo "========================================"
