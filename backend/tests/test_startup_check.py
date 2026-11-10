"""Tests for startup checks and production environment configuration safety."""

import pytest
from pydantic import ValidationError

from app.core.config import DEFAULT_DEV_JWT_SECRET, Settings


def test_production_startup_check_rejects_default_jwt_secret():
    """Startup must fail in production if default JWT secret is used."""
    with pytest.raises((ValidationError, ValueError)) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET=DEFAULT_DEV_JWT_SECRET,
        )
    assert "Production safety violation" in str(exc_info.value)


def test_production_startup_check_rejects_short_jwt_secret():
    """Startup must fail in production if JWT secret is shorter than 32 characters."""
    with pytest.raises((ValidationError, ValueError)) as exc_info:
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET="too_short_secret_under_32_chars",
        )
    assert "Production safety violation" in str(exc_info.value)


def test_production_startup_check_accepts_valid_jwt_secret():
    """Startup succeeds in production when a secure >= 32 char JWT secret is provided."""
    custom_secret = "a" * 32
    prod_settings = Settings(
        ENVIRONMENT="production",
        JWT_SECRET=custom_secret,
    )
    assert prod_settings.ENVIRONMENT == "production"
    assert prod_settings.JWT_SECRET == custom_secret


def test_development_startup_check_allows_default_secret():
    """Development environment allows the default development secret."""
    dev_settings = Settings(
        ENVIRONMENT="development",
        JWT_SECRET=DEFAULT_DEV_JWT_SECRET,
    )
    assert dev_settings.ENVIRONMENT == "development"
    assert dev_settings.JWT_SECRET == DEFAULT_DEV_JWT_SECRET

