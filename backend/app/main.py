"""FastAPI application entrypoint with health check, CORS, and lifecycle handling."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings


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

# CORS Configuration
origins = [origin.strip() for origin in settings.FRONTEND_ORIGIN.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    }
