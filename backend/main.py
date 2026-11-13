import logging
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app_review_backend")

app = FastAPI(
    title="Unified App Store Review Analytics API",
    description="Backend API for fetching ratings and user reviews from Google Play Store and Apple App Store.",
    version="1.0.0"
)

# Configure CORS
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
# Also allow wildcards for local development
if "*" not in allowed_origins:
    allowed_origins.append("http://localhost:5173")
    allowed_origins.append("http://127.0.0.1:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.routes import router
app.include_router(router)

@app.get("/")
def root():
    return {
        "message": "Unified App Store Review Analytics API is running.",
        "documentation": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)
