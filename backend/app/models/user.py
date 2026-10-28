"""User model and roles."""

from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, Enum):
    """User roles."""

    PATIENT = "patient"
    DOCTOR = "doctor"


class User(Base):
    """User account entity."""

    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('patient', 'doctor')", name="check_user_role"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.PATIENT.value)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    patient_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    avatar_color: Mapped[str | None] = mapped_column(String(30), nullable=True, default="#0E9AA7")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    doctor_profile: Mapped["DoctorProfile | None"] = relationship(  # noqa: F821
        "DoctorProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    patient_appointments: Mapped[list["Appointment"]] = relationship(  # noqa: F821
        "Appointment",
        back_populates="patient",
        foreign_keys="Appointment.patient_id",
        cascade="all, delete-orphan",
    )
    doctor_appointments: Mapped[list["Appointment"]] = relationship(  # noqa: F821
        "Appointment",
        back_populates="doctor",
        foreign_keys="Appointment.doctor_id",
        cascade="all, delete-orphan",
    )
    reminders: Mapped[list["Reminder"]] = relationship(  # noqa: F821
        "Reminder",
        back_populates="user",
        cascade="all, delete-orphan",
    )
