"""
Vercel Serverless Function Entry Point for FARMPRICE AI API.
Routes incoming /api/* requests to the FastAPI application.
"""
import sys
import os
from pathlib import Path

# Add project root to sys.path so 'backend' package is importable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Mark serverless environment
os.environ["VERCEL"] = "1"

# Import FastAPI ASGI application
from backend.app.main import app

# Export for Vercel Python Runtime (@vercel/python supports both 'app' and 'handler')
handler = app
