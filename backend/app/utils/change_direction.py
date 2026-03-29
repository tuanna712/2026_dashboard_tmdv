from typing import Literal

ChangeDirection = Literal["up", "down", "flat"]


def normalize_change_direction(raw: str | None) -> ChangeDirection:
    if not raw:
        return "flat"
    t = str(raw).strip().lower()
    if t in ("up", "increase", "positive"):
        return "up"
    if t in ("down", "decrease", "negative"):
        return "down"
    if t in ("flat", "unchanged", "neutral", "same"):
        return "flat"
    return "flat"
