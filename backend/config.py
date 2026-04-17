import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "data" / "playground.db"


class Settings:
    def __init__(self):
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")   
        self.LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")  

        self.DATABASE_URL = os.getenv(
            "DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"
        )

        self.CORS_ORIGINS = ["http://localhost:5500"]


settings = Settings()
