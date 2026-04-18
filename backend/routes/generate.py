from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.models.database import get_db, HistoryEntry
from backend.services.llm_service import call_llm
from backend.services.prompt_service import apply_technique, resolve_variables
from backend.services.output_parser import parse_output
from backend.services.token_counter import count_tokens_approx

router = APIRouter()


class GenerateRequest(BaseModel):
    user_prompt: str
    system_prompt: str = ""
    technique: str = "zero-shot"
    variables: dict = {}
    temperature: float = 0.7
    max_tokens: int = 1024
    top_p: float = 0.95
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    parse_output_type: str = "auto"


@router.post("/generate")
async def generate(req: GenerateRequest, db: Session = Depends(get_db)):
    try:
        
        user_prompt = resolve_variables(req.user_prompt, req.variables)
        
        user_prompt = apply_technique(user_prompt, req.technique)

        result = await call_llm(
            user_prompt=user_prompt,
            system_prompt=req.system_prompt,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            top_p=req.top_p,
            frequency_penalty=req.frequency_penalty,
            presence_penalty=req.presence_penalty,
        )

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])

        parsed = parse_output(result["output"], req.parse_output_type)

        entry = HistoryEntry(
            system_prompt=req.system_prompt,
            user_prompt=req.user_prompt,
            technique=req.technique,
            output=result["output"],
            model=result["model"],
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            top_p=req.top_p,
            input_tokens=result.get("input_tokens", count_tokens_approx(user_prompt)),
            output_tokens=result.get("output_tokens", count_tokens_approx(result["output"])),
            latency_ms=result.get("latency_ms", 0),
        )

        db.add(entry)
        db.commit()
        db.refresh(entry)  

        return {
            "output": result["output"],
            "model": result["model"],
            "input_tokens": entry.input_tokens,
            "output_tokens": entry.output_tokens,
            "latency_ms": entry.latency_ms,
            "parsed": parsed,
            "history_id": entry.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
