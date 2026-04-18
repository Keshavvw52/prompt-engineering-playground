import re
from typing import Dict


TECHNIQUE_PREFIXES = {
    "zero-shot": "",
    "few-shot": "Here are some examples:\n\n",
    "chain-of-thought": "Let's think step by step.\n\n",
    "role-based": "You are an expert assistant. ",
    "output-format": "Respond only in the following format:\n\n",
    "react": "Thought: [your reasoning]\nAction: [your action]\nObservation: [result]\nFinal Answer: [answer]\n\n",
}


def apply_technique(prompt: str, technique: str) -> str:
    prefix = TECHNIQUE_PREFIXES.get(technique, "")
    return prefix + prompt


def resolve_variables(prompt: str, variables: dict) -> str:
    def replacer(match):
        key = match.group(1).strip()
        return variables.get(key, match.group(0))
    return re.sub(r"\{\{(.+?)\}\}", replacer, prompt)


def extract_variables(prompt: str) -> list:
    return list(set(re.findall(r"\{\{(.+?)\}\}", prompt)))