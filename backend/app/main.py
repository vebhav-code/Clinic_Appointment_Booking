"""FastAPI application entrypoint with health check, CORS, routers, and exception handlers."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.routers import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown events."""
    yield


app = FastAPI(
    title="Clinic Appointment Booking API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Register centralized standard error handlers
register_error_handlers(app)

# CORS Configuration
origins = [origin.strip() for origin in settings.FRONTEND_ORIGIN.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 Router
api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth.router)

# Include in main app
app.include_router(api_v1_router)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint used by hosting services (Render) and monitors."""
    return {
        "status": "ok",
        "service": "clinic-appointment-booking-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "timezone": settings.CLINIC_TIMEZONE,
    }


@app.get("/", tags=["Root"])
def root():
    """Root redirect / information endpoint."""
    return {
        "message": "Welcome to Clinic Appointment Booking API",
        "docs": "/docs",
        "health": "/health",
        "api_v1": "/api/v1",
    }
