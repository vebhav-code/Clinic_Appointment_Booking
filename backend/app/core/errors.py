"""Standardized error responses, exceptions, and global exception handlers."""

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger("clinic_api")


class ErrorBody(BaseModel):
    """Inner error payload structure."""

    code: str
    message: str
    fields: dict[str, str] | None = None


class StandardErrorResponse(BaseModel):
    """Consistent standard JSON error envelope: {"error": {"code": "...", "message": "...", "fields": {...}}}."""

    error: ErrorBody


class AppError(Exception):
    """Domain-specific application error with HTTP status, code, and optional field errors."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        fields: dict[str, str] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.fields = fields


def create_error_response(
    status_code: int,
    code: str,
    message: str,
    fields: dict[str, str] | None = None,
) -> JSONResponse:
    """Build a standard error JSONResponse providing both root keys and nested error envelope."""
    clean_fields = fields if fields is not None else {}
    payload = {
        "code": code,
        "message": message,
        "fields": clean_fields,
        "error": {
            "code": code,
            "message": message,
            "fields": clean_fields,
        },
    }
    return JSONResponse(status_code=status_code, content=payload)


def register_error_handlers(app: FastAPI) -> None:
    """Register all centralized error handlers on the FastAPI application."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return create_error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            fields=exc.fields,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        fields: dict[str, str] = {}
        for err in exc.errors():
            loc = err.get("loc", ())
            # Extract the actual field name (ignore 'body', 'query', etc. if possible)
            field_name = ".".join(str(item) for item in loc if item not in ("body", "query", "path"))
            if not field_name:
                field_name = "non_field_error"
            msg = err.get("msg", "Invalid value")
            # Strip 'Value error, ' prefix if present
            if msg.startswith("Value error, "):
                msg = msg[len("Value error, ") :]
            fields[field_name] = msg

        return create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="One or more request fields are invalid.",
            fields=fields,
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        code_map = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
        }
        code = code_map.get(exc.status_code, "HTTP_ERROR")
        detail = exc.detail if isinstance(exc.detail, str) else "An HTTP error occurred."
        return create_error_response(
            status_code=exc.status_code,
            code=code,
            message=detail,
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled server exception: %s", exc)
        response = create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please try again later.",
        )
        # 500s are produced outside CORSMiddleware, so add CORS headers here; otherwise the
        # browser hides the real 500 and the frontend shows a fake "cannot connect" error.
        origin = request.headers.get("origin")
        if origin and origin.rstrip("/") in settings.cors_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
        return response