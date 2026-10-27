"""Pydantic schemas for booking, cancelling, rescheduling, and appointment lists."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BookAppointmentRequest(BaseModel):
    """Payload to book an appointment."""

    model_config = ConfigDict(extra="forbid")

    doctor_id: int
    start_at: datetime
    reason: str | None = Field(default=None, max_length=500)


class RescheduleAppointmentRequest(BaseModel):
    """Payload to reschedule an existing appointment."""

    model_config = ConfigDict(extra="forbid")

    new_start_at: datetime
    reason: str | None = Field(default=None, max_length=500)


class UpdateAppointmentStatusRequest(BaseModel):
    """Doctor payload to update appointment status."""

    model_config = ConfigDict(extra="forbid")

    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        clean = v.strip().lower()
        if clean not in ("completed", "no_show"):
            raise ValueError("Status must be either 'completed' or 'no_show'.")
        return clean


class AppointmentResponse(BaseModel):
    """Full appointment details with human-readable doctor and patient info."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    patient_id: int
    patient_name: str
    patient_email: str
    patient_phone: str | None = None
    doctor_id: int
    doctor_name: str
    doctor_speciality: str
    start_at: datetime
    end_at: datetime
    status: str
    reason: str | None = None
    created_at: datetime
    cancelled_at: datetime | None = None
    can_cancel_or_reschedule: bool = False
    cancellation_deadline: datetime | None = None
