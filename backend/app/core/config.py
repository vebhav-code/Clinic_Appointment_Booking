"""Application configuration and environment settings."""

import socket
from pathlib import Path
from urllib.parse import quote, unquote, urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve absolute path to the root Booking_System/.env file regardless of CWD
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BACKEND_DIR.parent
ROOT_ENV_FILE = ROOT_DIR / ".env"
BACKEND_ENV_FILE = BACKEND_DIR / ".env"


def normalize_database_url(url: str) -> str:
    """Normalize PostgreSQL connection URL to use psycopg (v3) driver.

    Converts `postgres://` or `postgresql://` to `postgresql+psycopg://`.
    Safely URL-encodes passwords containing special characters (such as `@`).
    """
    if not url:
        return url

    prefix = ""
    for p in ("postgresql+psycopg://", "postgres://", "postgresql://"):
        if url.startswith(p):
            prefix = p
            rest = url[len(p) :]
            break
    if not prefix:
        return url

    # If credentials contain unencoded '@', safely quote password so it is not mistaken for host delimiter
    if "@" in rest:
        parts = rest.split("@")
        if len(parts) > 2:
            creds = "@".join(parts[:-1])
            host_part = parts[-1]
            if ":" in creds:
                user, pw = creds.split(":", 1)
                pw_encoded = quote(unquote(pw), safe="")
                rest = f"{user}:{pw_encoded}@{host_part}"

    return "postgresql+psycopg://" + rest


class Settings(BaseSettings):
    """Clinic appointment booking application settings."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_ENV_FILE, BACKEND_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core Database
    DATABASE_URL: str = Field(
        default="postgresql://postgres:password@localhost:5432/clinic_booking",
        description="Main PostgreSQL connection URL",
    )
    TEST_DATABASE_URL: str | None = Field(
        default=None,
        description="Optional dedicated test PostgreSQL connection URL",
    )
    DEV_DATABASE_URL: str | None = Field(
        default=None,
        description="Local development database URL when working outside Render internal network",
    )

    # Security & Auth
    JWT_SECRET: str = Field(
        default="development_super_secret_jwt_key_must_be_overridden_in_prod_123456",
        min_length=16,
        description="Secret key for JWT token encoding/decoding",
    )
    JWT_EXPIRE_MINUTES: int = Field(
        default=1440,  # 24 hours
        description="JWT token expiry in minutes",
    )

    # Clinic Business Rules
    CLINIC_TIMEZONE: str = Field(
        default="Asia/Kolkata",
        description="Clinic operational timezone",
    )
    FRONTEND_ORIGIN: str = Field(
        default="http://localhost:5173",
        description="Allowed frontend origin for CORS",
    )
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,https://clinic-appointment-booking-ten.vercel.app",
        description="Comma-separated allowed frontend origins for CORS",
    )
    HOST: str = Field(
        default="0.0.0.0",
        description="Host to bind the server to",
    )
    PORT: int = Field(
        default=8000,
        description="Port to bind the server to",
    )
    GEMINI_API_KEY: str | None = Field(
        default=None,
        description="Optional Gemini API key from environment",
    )
    CANCEL_CUTOFF_HOURS: int = Field(
        default=2,
        ge=0,
        description="Hours before appointment when cancel/reschedule is locked",
    )
    BOOKING_WINDOW_DAYS: int = Field(
        default=60,
        ge=1,
        description="Max days ahead appointments can be booked",
    )
    SLOT_BUFFER_MINUTES: int = Field(
        default=0,
        ge=0,
        description="Minimum buffer in minutes before a slot can be booked",
    )

    # Optional Email Reminders
    EMAIL_REMINDERS_ENABLED: bool = Field(
        default=False,
        description="Enable external SMTP email notifications",
    )
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str | None = None
    SMTP_TLS: bool = True

    @field_validator("CLINIC_TIMEZONE")
    @classmethod
    def validate_timezone(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except ZoneInfoNotFoundError as err:
            raise ValueError(f"Invalid timezone: {v}. Must be a valid IANA timezone string.") from err
        return v

    @property
    def sync_database_url(self) -> str:
        """Normalized sync database URL for SQLAlchemy with psycopg3.

        If the primary DATABASE_URL points to a Render internal host that cannot
        resolve in the current environment, seamlessly falls back to DEV_DATABASE_URL.
        """
        raw_url = self.DATABASE_URL
        if self.DEV_DATABASE_URL:
            try:
                clean_url = raw_url.replace("postgresql+psycopg://", "postgresql://")
                parsed = urlparse(clean_url)
                if parsed.hostname:
                    socket.gethostbyname(parsed.hostname)
            except (socket.gaierror, OSError):
                raw_url = self.DEV_DATABASE_URL
        return normalize_database_url(raw_url)

    @property
    def sync_test_database_url(self) -> str:
        """Normalized sync test database URL for testing with psycopg3."""
        target = self.TEST_DATABASE_URL or self.DATABASE_URL
        return normalize_database_url(target)

    @property
    def tz(self) -> ZoneInfo:
        """Return the parsed ZoneInfo object for the clinic timezone."""
        return ZoneInfo(self.CLINIC_TIMEZONE)

    @property
    def cors_origins(self) -> list[str]:
        """Return parsed list of allowed CORS origins without trailing slashes.

        Reads from ALLOWED_ORIGINS (or fallback FRONTEND_ORIGIN), stripping
        whitespace and trailing slashes. Guarantees that the local frontend origin
        and the production Vercel frontend origin are both accepted.
        """
        raw_list: list[str] = []
        if self.ALLOWED_ORIGINS:
            raw_list.extend(self.ALLOWED_ORIGINS.split(","))
        if self.FRONTEND_ORIGIN:
            raw_list.extend(self.FRONTEND_ORIGIN.split(","))

        origins: list[str] = []
        for origin in raw_list:
            cleaned = origin.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)

        # Ensure both the local frontend and production Vercel frontend are allowed
        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://clinic-appointment-booking-ten.vercel.app",
        ]
        for def_origin in defaults:
            cleaned_def = def_origin.rstrip("/")
            if cleaned_def not in origins:
                origins.append(cleaned_def)

        return origins


settings = Settings()
