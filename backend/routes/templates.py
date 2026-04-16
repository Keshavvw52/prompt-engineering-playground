from fastapi import APIRouter
import json
import os

router = APIRouter()

TEMPLATES_FILE = os.path.join(os.path.dirname(__file__), "../data/templates.json")


@router.get("/templates")
def list_templates():
    try:
        with open(TEMPLATES_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []