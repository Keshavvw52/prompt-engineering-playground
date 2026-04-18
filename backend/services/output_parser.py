import json
import re


def parse_output(text: str, parse_type: str = "auto") -> dict:
    result = {"raw": text, "type": "text", "parsed": None, "error": None}

    if parse_type == "json" or parse_type == "auto":
        json_result = _try_parse_json(text)
        if json_result is not None:
            result["type"] = "json"
            result["parsed"] = json_result
            return result

    if parse_type == "code" or parse_type == "auto":
        code_blocks = _extract_code_blocks(text)
        if code_blocks:
            result["type"] = "code"
            result["parsed"] = code_blocks
            return result

    if parse_type == "list" or parse_type == "auto":
        items = _extract_list(text)
        if items:
            result["type"] = "list"
            result["parsed"] = items
            return result

    return result


def _try_parse_json(text: str):
    # Try to find JSON block in text
    json_match = re.search(r"```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```", text)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except Exception:
            pass
    # Try raw JSON
    stripped = text.strip()
    if (stripped.startswith("{") and stripped.endswith("}")) or \
       (stripped.startswith("[") and stripped.endswith("]")):
        try:
            return json.loads(stripped)
        except Exception:
            pass
    return None


def _extract_code_blocks(text: str) -> list:
    blocks = re.findall(r"```(\w*)\n([\s\S]*?)```", text)
    if blocks:
        return [{"lang": lang or "plaintext", "code": code.strip()} for lang, code in blocks]
    return []


def _extract_list(text: str) -> list:
    # Numbered list
    numbered = re.findall(r"^\s*\d+\.\s+(.+)$", text, re.MULTILINE)
    if len(numbered) >= 2:
        return numbered
    # Bullet list
    bulleted = re.findall(r"^\s*[-*•]\s+(.+)$", text, re.MULTILINE)
    if len(bulleted) >= 2:
        return bulleted
    return []