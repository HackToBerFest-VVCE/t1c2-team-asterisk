import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings, get_uploads_dir
from backend.app.api.router import api_router

# Ensure uploads directory exists (uses /tmp in serverless environments like Vercel)
uploads_dir = get_uploads_dir()

app = FastAPI(
    title="FARMPRICE AI API",
    description=(
        "Agricultural Market Intelligence Platform API. "
        "Powers smart mandi comparison, deterministic net return calculations, "
        "Snowflake analytics, explainable recommendations, and time-series price forecasting."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend Single Page Application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # allow all during dev for easy local testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount persistent uploads directory
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "project": "FARMPRICE AI",
        "tagline": "Know Your Market. Calculate Your Return. Sell With Confidence.",
        "documentation": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.app_host, port=settings.app_port, reload=True)
