#!/usr/bin/env python3
"""
Alternative entry point that can be run from backend directory.
Sets up PYTHONPATH and runs uvicorn.
"""
import sys
import os
from pathlib import Path

# Get project root (parent of backend directory)
backend_dir = Path(__file__).parent
project_root = backend_dir.parent

# Add project root to PYTHONPATH
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Change to project root
os.chdir(project_root)

# Now import and run
if __name__ == "__main__":
    import uvicorn
    from backend.config import settings
    
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )




