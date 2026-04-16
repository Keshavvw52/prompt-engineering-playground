from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from backend.config import settings
from backend.models.database import init_db
from backend.routes import generate, compare, prompts, history, templates

app = FastAPI(title="Prompt Engineering Playground", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init DB
init_db()

# Register routers
app.include_router(generate.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(prompts.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(templates.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "provider": settings.LLM_PROVIDER}


# Serve frontend static files
frontend_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=frontend_path), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(frontend_path, "index.html"))