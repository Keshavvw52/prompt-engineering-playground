def count_tokens(text: str) -> int:
    """
    Approximate token count (safe for production)
    ~4 characters ≈ 1 token
    """
    if not text:
        return 0
    return max(1, len(text) // 4)


def count_tokens_approx(text: str) -> int:
    return count_tokens(text)
