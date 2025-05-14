# This will be a simplified version that imports your main app
import sys
import os
from pathlib import Path

# Add the backend directory to Python path to access your modules
backend_path = Path(__file__).parent.parent / 'backend'
sys.path.insert(0, str(backend_path))

# Now import your FastAPI app
from main import app

# Vercel needs the app to be exposed at module level
# Your app is already created in main.py, so we just need to expose it