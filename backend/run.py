import sys
from pathlib import Path
import uvicorn

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

if __name__ == "__main__":
    from backend.app.core.config import settings
    print(f"Starting FARMPRICE AI Backend on http://{settings.app_host}:{settings.app_port} ...")
    uvicorn.run("backend.app.main:app", host=settings.app_host, port=settings.app_port, reload=False)
