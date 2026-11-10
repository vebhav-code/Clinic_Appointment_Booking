"""FastAPI application entrypoint with health check, CORS, routers, and exception handlers."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_error_handlers
from app.routers import appointments, auth, doctor_management, doctors, profile, reminders


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown events."""
    if (settings.ENVIRONMENT or "").strip().lower() == "production":
        from app.core.config import DEFAULT_DEV_JWT_SECRET
        if settings.JWT_SECRET == DEFAULT_DEV_JWT_SECRET or len(settings.JWT_SECRET) < 32:
            raise RuntimeError(
                "Production startup failed: JWT_SECRET must be at least 32 characters and not use the default value."
            )
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

# CORS Configuration: allows configured origins (local development and production Vercel frontend)
origins = settings.cors_origins

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
api_v1_router.include_router(profile.router)
api_v1_router.include_router(doctors.router)
api_v1_router.include_router(doctor_management.router)
api_v1_router.include_router(appointments.router)
api_v1_router.include_router(reminders.router)

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


if __name__ == "__main__":
    import os

    import uvicorn

    host = os.getenv("HOST", settings.HOST)
    port = int(os.getenv("PORT", str(settings.PORT)))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
