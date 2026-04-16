import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
        self.GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")   
        self.LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")  

        self.DATABASE_URL = os.getenv(
            "DATABASE_URL", "sqlite:///./playground.db"
        )

        self.CORS_ORIGINS = ["*"]


settings = Settings()