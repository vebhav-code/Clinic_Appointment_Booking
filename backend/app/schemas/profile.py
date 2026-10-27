"""Pydantic schemas for user profile management, password security, and patient notes."""

import re
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

PHONE_REGEX = re.compile(r"^\+?[0-9\s\-()]{7,25}$")


class DoctorProfessionalDetails(BaseModel):
    """Doctor-specific professional details included in profile."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    speciality: str
    bio: str | None = None
    qualifications: str | None = None
    years_of_experience: int | None = None
    languages: list[str] = Field(default_factory=list)
    slot_minutes: int
    consultation_fee: Decimal | None = None
    is_active: bool


class ProfileResponse(BaseModel):
    """Current authenticated user profile response."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    email: str
    full_name: str
    role: str
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    patient_notes: str | None = None
    avatar_color: str | None = None
    created_at: datetime
    total_appointments: int = 0
    upcoming_appointments: int = 0
    completed_appointments: int = 0
    doctor_profile: DoctorProfessionalDetails | None = None


class UpdateProfileRequest(BaseModel):
    """Role-aware user profile update payload with strict validation."""

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=25)
    date_of_birth: date | None = None
    gender: str | None = None
    emergency_contact_name: str | None = Field(default=None, max_length=100)
    emergency_contact_phone: str | None = Field(default=None, max_length=25)
    patient_notes: str | None = Field(default=None, max_length=2000)
    avatar_color: str | None = Field(default=None, max_length=30)

    # Doctor specific fields (optional; only updated if user is a doctor)
    speciality: str | None = Field(default=None, max_length=100)
    bio: str | None = None
    qualifications: str | None = Field(default=None, max_length=255)
    years_of_experience: int | None = Field(default=None, ge=0, le=70)
    languages: list[str] | None = None
    consultation_fee: Decimal | None = Field(default=None, ge=0)

    @field_validator("phone", "emergency_contact_phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip()
        if not cleaned:
            return None
        if not PHONE_REGEX.match(cleaned):
            raise ValueError("Invalid phone number format. Include digits and optional '+' or hyphens.")
        return cleaned

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: date | None) -> date | None:
        if v is None:
            return None
        today = date.today()
        if v >= today:
            raise ValueError("Date of birth must be in the past.")
        if today.year - v.year > 120:
            raise ValueError("Date of birth cannot indicate an age older than 120 years.")
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip().lower()
        if not cleaned:
            return None
        allowed = {"male", "female", "non_binary", "prefer_not_to_say"}
        if cleaned not in allowed:
            raise ValueError(f"Gender must be one of: {', '.join(sorted(allowed))}.")
        return cleaned


class ChangePasswordRequest(BaseModel):
    """Payload to securely change user password."""

    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128, description="Minimum 8 characters")

    @field_validator("new_password")
    @classmethod
    def validate_new_not_same(cls, v: str, info) -> str:
        current = info.data.get("current_password")
        if current and v == current:
            raise ValueError("New password cannot be the same as the current password.")
        return v


class PatientNotesResponse(BaseModel):
    """Patient clinical notes returned to authorized doctor."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    patient_id: int
    patient_name: str
    patient_notes: str | None = None
