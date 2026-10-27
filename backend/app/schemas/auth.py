"""Pydantic schemas for authentication and user accounts."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterPatientRequest(BaseModel):
    """Payload for patient self-registration."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="Password min 8 chars")
    full_name: str = Field(min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=20)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("full_name")
    @classmethod
    def clean_full_name(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Full name cannot be blank.")
        return cleaned


class LoginRequest(BaseModel):
    """Payload for user login."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class DoctorProfileSummary(BaseModel):
    """Doctor profile summary included with doctor user info."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    speciality: str
    bio: str | None = None
    slot_minutes: int
    consultation_fee: float | None = None
    is_active: bool


class UserResponse(BaseModel):
    """Public user response schema."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    email: str
    full_name: str
    role: str
    phone: str | None = None
    created_at: datetime
    doctor_profile: DoctorProfileSummary | None = None


class TokenResponse(BaseModel):
    """JWT authentication response payload."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
