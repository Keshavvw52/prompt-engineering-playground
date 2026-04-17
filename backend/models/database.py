from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from pathlib import Path
from backend.config import settings

if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = Path(settings.DATABASE_URL.replace("sqlite:///", "", 1))
    db_path.parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SavedPrompt(Base):
    __tablename__ = "saved_prompts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    system_prompt = Column(Text, default="")
    user_prompt = Column(Text, nullable=False)
    technique = Column(String(100), default="zero-shot")
    tags = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HistoryEntry(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    system_prompt = Column(Text, default="")
    user_prompt = Column(Text, nullable=False)
    technique = Column(String(100), default="zero-shot")
    output = Column(Text, nullable=False)
    model = Column(String(100), default="gemini")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=1024)
    top_p = Column(Float, default=0.95)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
