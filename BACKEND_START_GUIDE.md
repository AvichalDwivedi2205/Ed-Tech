# Backend Startup Guide

## The Problem

When running uvicorn from the `backend` directory, Python cannot find the `backend` module because:
- Your code uses `from backend.config import settings`
- Python looks for modules relative to the current working directory
- Running from `backend/` means Python doesn't know about the `backend` package

## Solution: Run from Project Root

**Always run uvicorn from the project root (`/home/avich/openT`), NOT from the `backend` directory.**

## Method 1: Using start.sh (Recommended)

```bash
# From anywhere in the project
./backend/start.sh
```

This script:
1. Automatically navigates to project root
2. Activates virtual environment
3. Sets PYTHONPATH correctly
4. Runs uvicorn with proper configuration

## Method 2: Manual Command

```bash
# Step 1: Navigate to project root
cd /home/avich/openT

# Step 2: Activate virtual environment
source venv/bin/activate

# Step 3: Run uvicorn (note the 'backend.' prefix)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## Method 3: Using Python run.py

```bash
# From backend directory
cd backend
python3 run.py
```

This Python script automatically:
- Finds project root
- Sets PYTHONPATH
- Changes to project root
- Runs uvicorn

## Common Errors

### Error: `ModuleNotFoundError: No module named 'backend'`

**Cause:** Running uvicorn from `backend/` directory instead of project root.

**Fix:**
```bash
# Wrong (from backend directory):
cd backend
uvicorn backend.main:app  # ❌ This fails

# Correct (from project root):
cd /home/avich/openT
uvicorn backend.main:app  # ✅ This works
```

### Error: `ModuleNotFoundError: No module named 'pydantic_settings'`

**Cause:** Virtual environment not activated or dependencies not installed.

**Fix:**
```bash
cd /home/avich/openT
source venv/bin/activate
pip install -r requirements.txt
```

## Verification

After starting, you should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXX] using WatchFiles
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Test the server:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"OpenT Agents API"}
```

## Quick Reference

| Location | Command | Works? |
|----------|---------|--------|
| Project root | `uvicorn backend.main:app` | ✅ Yes |
| backend/ | `uvicorn backend.main:app` | ❌ No |
| backend/ | `uvicorn main:app` | ❌ No (wrong imports) |
| Anywhere | `./backend/start.sh` | ✅ Yes |
| backend/ | `python3 run.py` | ✅ Yes |




