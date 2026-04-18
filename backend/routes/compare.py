from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from models.database import get_db
from services.llm_service import call_llm
from services.prompt_service import apply_technique, resolve_variables
import asyncio

router = APIRouter()


class PromptConfig(BaseModel):
    user_prompt: str
    system_prompt: str = ""
    technique: str = "zero-shot"
    variables: dict = Field(default_factory=dict)
    temperature: float = 0.7
    max_tokens: int = 1024
    top_p: float = 0.95


class CompareRequest(BaseModel):
    prompt_a: PromptConfig
    prompt_b: PromptConfig


class SweepRequest(BaseModel):
    user_prompt: str
    system_prompt: str = ""
    temperatures: list[float] = Field(
        default_factory=lambda: [0.2, 0.7, 1.2],
        max_length=5
    )
    max_tokens: int = 512


@router.post("/compare")
async def compare(req: CompareRequest, db: Session = Depends(get_db)):
    try:
        async def run_prompt(cfg: PromptConfig):
            prompt = resolve_variables(cfg.user_prompt, cfg.variables)
            prompt = apply_technique(prompt, cfg.technique)
            return await call_llm(
                user_prompt=prompt,
                system_prompt=cfg.system_prompt,
                temperature=cfg.temperature,
                max_tokens=cfg.max_tokens,
                top_p=cfg.top_p,
            )

        result_a, result_b = await asyncio.gather(run_prompt(req.prompt_a), run_prompt(req.prompt_b))
        return {"result_a": result_a, "result_b": result_b}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sweep")
async def sweep(req: SweepRequest, db: Session = Depends(get_db)):
    try:
        async def run(temp):
            result = await call_llm(
                user_prompt=req.user_prompt,
                system_prompt=req.system_prompt,
                temperature=temp,
                max_tokens=req.max_tokens,
            )
            return {"temperature": temp, **result}

        results = await asyncio.gather(*[run(t) for t in req.temperatures])
        return {"results": list(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))