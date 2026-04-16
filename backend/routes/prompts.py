from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from backend.models.database import get_db, SavedPrompt

router = APIRouter()


class PromptCreate(BaseModel):
    name: str
    system_prompt: str = ""
    user_prompt: str
    technique: str = "zero-shot"
    tags: str = ""


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    user_prompt: Optional[str] = None
    technique: Optional[str] = None
    tags: Optional[str] = None


@router.post("/prompts")
def save_prompt(req: PromptCreate, db: Session = Depends(get_db)):
    prompt = SavedPrompt(**req.dict())
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return _to_dict(prompt)


@router.get("/prompts")
def list_prompts(db: Session = Depends(get_db)):
    prompts = db.query(SavedPrompt).order_by(SavedPrompt.created_at.desc()).all()
    return [_to_dict(p) for p in prompts]


@router.put("/prompts/{prompt_id}")
def update_prompt(prompt_id: int, req: PromptUpdate, db: Session = Depends(get_db)):
    prompt = db.query(SavedPrompt).filter(SavedPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    for key, value in req.dict(exclude_none=True).items():
        setattr(prompt, key, value)
    prompt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prompt)
    return _to_dict(prompt)


@router.delete("/prompts/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(SavedPrompt).filter(SavedPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()
    return {"deleted": True}


def _to_dict(p: SavedPrompt) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "system_prompt": p.system_prompt,
        "user_prompt": p.user_prompt,
        "technique": p.technique,
        "tags": p.tags,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }