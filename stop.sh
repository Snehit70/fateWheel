#!/bin/bash

# Ensure we are in the script's directory
cd "$(dirname "$0")"

PIDS_FILE="logs/.pids"

if [ -f "$PIDS_FILE" ]; then
    echo "Stopping application..."
    while read pid; do
        if [ -n "$pid" ]; then
            echo "Killing process $pid..."
            kill $pid 2>/dev/null || echo "Process $pid not found or already dead."
        fi
    done < "$PIDS_FILE"
    rm "$PIDS_FILE"
    echo "Application stopped."
else
    echo "No .pids file found. Is the application running?"
fi
