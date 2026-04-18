from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db, HistoryEntry

router = APIRouter()


@router.get("/history")
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    entries = db.query(HistoryEntry).order_by(HistoryEntry.created_at.desc()).limit(limit).all()
    return [_to_dict(e) for e in entries]


@router.delete("/history/{entry_id}")
def delete_history_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(HistoryEntry).filter(HistoryEntry.id == entry_id).first()
    if entry:
        db.delete(entry)
        db.commit()
    return {"deleted": True}


def _to_dict(e: HistoryEntry) -> dict:
    return {
        "id": e.id,
        "system_prompt": e.system_prompt,
        "user_prompt": e.user_prompt,
        "technique": e.technique,
        "output": e.output,
        "model": e.model,
        "temperature": e.temperature,
        "max_tokens": e.max_tokens,
        "top_p": e.top_p,
        "input_tokens": e.input_tokens,
        "output_tokens": e.output_tokens,
        "latency_ms": e.latency_ms,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }