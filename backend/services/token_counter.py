def count_tokens_approx(text: str) -> int:
    """Approximate token count: ~4 chars per token"""
    if not text:
        return 0
    return max(1, len(text) // 4)


def count_tokens_tiktoken(text: str, model: str = "gpt-4") -> int:
    try:
        import tiktoken
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))
    except Exception:
        return count_tokens_approx(text)