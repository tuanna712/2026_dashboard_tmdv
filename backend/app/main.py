import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings, parse_cors_origins
from app.core.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, list):
        msg = "; ".join(str(x) for x in detail)
    elif isinstance(detail, dict):
        msg = str(detail.get("detail", detail))
    else:
        msg = str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"data": None, "message": msg, "errors": [msg]},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    errs = [f"{e['loc']}: {e['msg']}" for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"data": None, "message": "validation error", "errors": errs},
    )


app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
