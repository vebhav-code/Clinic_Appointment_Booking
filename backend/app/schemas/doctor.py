"""Pydantic schemas for doctors, availability rules, leaves, and slots."""

from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DoctorListItem(BaseModel):
    """Doctor summary for directory listing."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    full_name: str
    email: str
    phone: str | None = None
    speciality: str
    bio: str | None = None
    slot_minutes: int
    consultation_fee: Decimal | None = None
    is_active: bool


class AvailabilityRuleItem(BaseModel):
    """Availability rule response schema."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    weekday: int
    start_time: time
    end_time: time


class DoctorDetailResponse(DoctorListItem):
    """Detailed doctor profile with active availability rules and upcoming leaves."""

    availability_rules: list[AvailabilityRuleItem] = []


class TimeWindowSchema(BaseModel):
    """Time window with start_time < end_time."""

    model_config = ConfigDict(extra="forbid")

    start_time: time
    end_time: time

    @field_validator("end_time")
    @classmethod
    def validate_times(cls, v: time, info) -> time:
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError(f"start_time ({start.strftime('%H:%M')}) must be before end_time ({v.strftime('%H:%M')}).")
        return v


class WeekdayAvailabilityInput(BaseModel):
    """Availability windows for a single weekday."""

    model_config = ConfigDict(extra="forbid")

    weekday: int = Field(ge=0, le=6, description="0=Monday, 6=Sunday")
    windows: list[TimeWindowSchema] = Field(default_factory=list)


class UpdateDoctorAvailabilityRequest(BaseModel):
    """Doctor payload to update slot length and weekly availability windows."""

    model_config = ConfigDict(extra="forbid")

    slot_minutes: int = Field(description="Must be 15 or 30 minutes")
    schedule: list[WeekdayAvailabilityInput]
    bio: str | None = None
    consultation_fee: Decimal | None = None

    @field_validator("slot_minutes")
    @classmethod
    def validate_slot_minutes(cls, v: int) -> int:
        if v not in (15, 30):
            raise ValueError("slot_minutes must be either 15 or 30.")
        return v


class DoctorLeaveCreateRequest(BaseModel):
    """Payload to block off a single day."""

    model_config = ConfigDict(extra="forbid")

    date: date
    reason: str | None = Field(default=None, max_length=255)


class DoctorLeaveResponse(BaseModel):
    """Doctor leave response item."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    doctor_id: int
    date: date
    reason: str | None = None


class GeneratedSlotItem(BaseModel):
    """Slot item returned to client."""

    start_at: datetime
    end_at: datetime
    local_start: str
    local_end: str


class SlotsResponse(BaseModel):
    """Response containing free slots for a doctor on a specific date."""

    doctor_id: int
    date: date
    slot_minutes: int
    is_on_leave: bool
    leave_reason: str | None = None
    slots: list[GeneratedSlotItem]
