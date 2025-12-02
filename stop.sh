#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

PIDS_FILE="logs/.pids"

# Function to kill a process safely
kill_process() {
    local pid=$1
    if [ -n "$pid" ]; then
        echo "Stopping process $pid..."
        kill $pid 2>/dev/null
        
        # Wait up to 5 seconds for process to exit
        for i in {1..5}; do
            if ! kill -0 $pid 2>/dev/null; then
                echo "Process $pid stopped."
                return
            fi
            sleep 1
        done
        
        # Force kill if still running
        echo "Process $pid did not stop. Force killing..."
        kill -9 $pid 2>/dev/null || echo "Process $pid already dead."
    fi
}

# 1. Try to kill using PIDs file
if [ -f "$PIDS_FILE" ]; then
    echo "Stopping processes from .pids file..."
    while read pid; do
        kill_process "$pid"
    done < "$PIDS_FILE"
    rm "$PIDS_FILE"
fi

# 2. Fallback: Check ports 3000 (Backend) and 5173 (Frontend)
echo "Checking for remaining processes on ports..."

# Find PID for port 3000
BACKEND_PID=$(lsof -t -i:3000)
if [ -n "$BACKEND_PID" ]; then
    echo "Found backend on port 3000 (PID: $BACKEND_PID)"
    kill_process "$BACKEND_PID"
fi

# Find PID for port 5173
FRONTEND_PID=$(lsof -t -i:5173)
if [ -n "$FRONTEND_PID" ]; then
    echo "Found frontend on port 5173 (PID: $FRONTEND_PID)"
    kill_process "$FRONTEND_PID"
fi

echo "Application stopped."
