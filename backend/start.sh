#!/bin/bash
# Start script for backend - runs from project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT" || exit

# Activate virtual environment
if [ -f "$PROJECT_ROOT/venv/bin/activate" ]; then
    source "$PROJECT_ROOT/venv/bin/activate"
else
    echo "Error: Virtual environment not found at $PROJECT_ROOT/venv"
    exit 1
fi

# Add project root to PYTHONPATH to ensure imports work
export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"

# Start uvicorn from project root
echo "Starting backend from: $PROJECT_ROOT"
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

