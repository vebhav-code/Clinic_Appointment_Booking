"""Doctor profiles, weekly availability rules, and leave management models."""

from datetime import date, time
from decimal import Decimal
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DoctorProfile(Base):
    """Doctor profile information linked 1:1 with User."""

    __tablename__ = "doctor_profiles"
    __table_args__ = (
        CheckConstraint("slot_minutes IN (15, 30)", name="check_slot_minutes"),
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    speciality: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    slot_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    consultation_fee: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="doctor_profile")  # noqa: F821
    availability_rules: Mapped[list["AvailabilityRule"]] = relationship(
        "AvailabilityRule",
        back_populates="doctor",
        cascade="all, delete-orphan",
        order_by="AvailabilityRule.weekday, AvailabilityRule.start_time",
    )
    leaves: Mapped[list["DoctorLeave"]] = relationship(
        "DoctorLeave",
        back_populates="doctor",
        cascade="all, delete-orphan",
        order_by="DoctorLeave.date",
    )


class AvailabilityRule(Base):
    """Weekly recurring availability window for a doctor."""

    __tablename__ = "availability_rules"
    __table_args__ = (
        CheckConstraint("weekday >= 0 AND weekday <= 6", name="check_weekday_range"),
        CheckConstraint("start_time < end_time", name="check_availability_start_before_end"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    doctor: Mapped["DoctorProfile"] = relationship(
        "DoctorProfile",
        back_populates="availability_rules",
        foreign_keys=[doctor_id],
    )


class DoctorLeave(Base):
    """Specific dates blocked off by a doctor (leaves/holidays)."""

    __tablename__ = "doctor_leaves"
    __table_args__ = (
        UniqueConstraint("doctor_id", "date", name="uq_doctor_leave_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    doctor: Mapped["DoctorProfile"] = relationship(
        "DoctorProfile",
        back_populates="leaves",
        foreign_keys=[doctor_id],
    )
