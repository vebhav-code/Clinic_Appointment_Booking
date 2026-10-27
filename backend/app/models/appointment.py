"""Appointment and Reminder models with PostgreSQL EXCLUDE constraint."""

from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AppointmentStatus(str, Enum):
    """Appointment statuses."""
    BOOKED = "booked"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"


class Appointment(Base):
    """Clinic appointment with strict PostgreSQL concurrency exclusion constraint."""

    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('booked', 'completed', 'no_show', 'cancelled')",
            name="check_appointment_status",
        ),
        CheckConstraint("start_at < end_at", name="check_appointment_start_before_end"),
        Index("ix_appointments_doctor_start", "doctor_id", "start_at"),
        Index("ix_appointments_patient_start", "patient_id", "start_at"),
        # Core concurrency constraint: No overlapping active appointments for the same doctor
        ExcludeConstraint(
            ("doctor_id", "="),
            (text("tstzrange(start_at, end_at)"), "&&"),
            where=text("status IN ('booked', 'completed', 'no_show')"),
            using="gist",
            name="exclude_doctor_overlapping_appointments",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    doctor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=AppointmentStatus.BOOKED.value,
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    patient: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="patient_appointments",
        foreign_keys=[patient_id],
    )
    doctor: Mapped["User"] = relationship(  # noqa: F821
        "User",
        back_populates="doctor_appointments",
        foreign_keys=[doctor_id],
    )
    canceller: Mapped["User | None"] = relationship(  # noqa: F821
        "User",
        foreign_keys=[cancelled_by],
    )
    reminders: Mapped[list["Reminder"]] = relationship(
        "Reminder",
        back_populates="appointment",
        cascade="all, delete-orphan",
    )


class Reminder(Base):
    """In-app appointment reminders."""

    __tablename__ = "reminders"
    __table_args__ = (
        UniqueConstraint("appointment_id", "user_id", name="uq_appointment_user_reminder"),
        Index("ix_reminders_user_remind_read", "user_id", "remind_at", "read_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    appointment_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="reminders")  # noqa: F821
    appointment: Mapped["Appointment"] = relationship("Appointment", back_populates="reminders")
