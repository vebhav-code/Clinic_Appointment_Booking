"""Application configuration and environment settings."""

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Normalize PostgreSQL connection URL to use psycopg (v3) driver.

    Converts `postgres://` or `postgresql://` to `postgresql+psycopg://`.
    """
    if not url:
        return url
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


class Settings(BaseSettings):
    """Clinic appointment booking application settings."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
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
        """Normalized sync database URL for SQLAlchemy with psycopg3."""
        return normalize_database_url(self.DATABASE_URL)

    @property
    def sync_test_database_url(self) -> str:
        """Normalized sync test database URL for testing with psycopg3."""
        target = self.TEST_DATABASE_URL or self.DATABASE_URL
        return normalize_database_url(target)

    @property
    def tz(self) -> ZoneInfo:
        """Return the parsed ZoneInfo object for the clinic timezone."""
        return ZoneInfo(self.CLINIC_TIMEZONE)


settings = Settings()
