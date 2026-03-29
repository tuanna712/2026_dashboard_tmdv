from typing import Any

from pydantic import BaseModel


class APIEnvelope(BaseModel):
    data: Any | None = None
    message: str = "ok"
    errors: list[str] | None = None


def ok(data: Any, message: str = "ok") -> dict[str, Any]:
    return {"data": data, "message": message, "errors": None}


def fail(errors: list[str], message: str = "error", data: Any | None = None) -> dict[str, Any]:
    return {"data": data, "message": message, "errors": errors}
