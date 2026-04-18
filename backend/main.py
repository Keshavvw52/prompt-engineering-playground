from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import settings
from models.database import init_db
from routes import generate, compare, prompts, history


app = FastAPI(title="Prompt Engineering Playground", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change later after deploy
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


@app.get("/api/health")
def health():
    return {"status": "ok", "provider": settings.LLM_PROVIDER}


# ===== SERVE FRONTEND (IMPORTANT) =====

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_path = os.path.join(BASE_DIR, "frontend")

print("FRONTEND PATH:", frontend_path)
print("EXISTS:", os.path.exists(frontend_path))

app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")