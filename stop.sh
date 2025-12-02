#!/bin/bash

PIDS_FILE="$(pwd)/.pids"

if [ -f "$PIDS_FILE" ]; then
    echo "Stopping application..."
    while read pid; do
        if [ -n "$pid" ]; then
            echo "Killing process $pid..."
            # Kill the process group to ensure child processes (like node/vite) are also killed
            # We use standard kill first. If it's a shell script wrapper, we might need to be more aggressive,
            # but usually killing the parent npm process works if it forwards signals. 
            # However, npm often doesn't. 
            # A safer bet for development scripts is to kill the process.
            kill $pid 2>/dev/null || echo "Process $pid not found or already dead."
        fi
    done < "$PIDS_FILE"
    rm "$PIDS_FILE"
    echo "Application stopped."
else
    echo "No .pids file found. Is the application running?"
fi
