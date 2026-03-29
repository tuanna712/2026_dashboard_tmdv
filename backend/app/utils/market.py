"""Map dashboard `market` query param to `price_source.source_code` values."""

from typing import Literal

Market = Literal["international", "domestic"]


def resolve_history_source(
    market: str | None,
    explicit_source: str | None,
) -> str | None:
    """
    If `source` is set, it wins. Else map `market` to INTL/DOM.
    Returns None if neither is usable (caller may apply default).
    """
    if explicit_source and explicit_source.strip():
        return explicit_source.strip().upper()
    if not market or not market.strip():
        return None
    m = market.strip().lower()
    if m == "international":
        return "INTL"
    if m == "domestic":
        return "DOM"
    return None


def default_source_for_market(market: str | None) -> str:
    """When market is absent, default to DOM for history (matches sample CSV)."""
    s = resolve_history_source(market, None)
    return s or "DOM"
