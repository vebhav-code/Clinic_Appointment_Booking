"""Pydantic schemas for in-app reminders."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ReminderItem(BaseModel):
    """In-app reminder notification item."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    appointment_id: int
    title: str
    message: str
    start_at: datetime
    remind_at: datetime
    read_at: datetime | None = None
    doctor_name: str
    patient_name: str


class ReminderListResponse(BaseModel):
    """List of active notifications and unread badge count."""

    unread_count: int
    reminders: list[ReminderItem]
