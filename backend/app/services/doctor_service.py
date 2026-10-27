"""Doctor management, availability rules, leaves, and slots service."""

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import AppError
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import AvailabilityRule, DoctorLeave, DoctorProfile
from app.models.user import User, UserRole
from app.schemas.doctor import (
    DoctorDetailResponse,
    DoctorListItem,
    GeneratedSlotItem,
    SlotsResponse,
    UpdateDoctorAvailabilityRequest,
)
from app.services.slot_generator import (
    BookedInterval,
    TimeWindow,
    generate_slots_for_date,
    validate_no_overlapping_windows,
)


def get_all_doctors(
    db: Session,
    speciality: str | None = None,
    search: str | None = None,
) -> list[DoctorListItem]:
    """List all active doctors with optional search and speciality filters."""
    query = (
        select(User, DoctorProfile)
        .join(DoctorProfile, User.id == DoctorProfile.user_id)
        .where(User.role == UserRole.DOCTOR.value, DoctorProfile.is_active.is_(True))
    )

    if speciality:
        query = query.where(func.lower(DoctorProfile.speciality) == speciality.strip().lower())

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(User.full_name).like(search_term)
            | func.lower(DoctorProfile.speciality).like(search_term)
        )

    query = query.order_by(User.full_name)
    results = db.execute(query).all()

    items: list[DoctorListItem] = []
    for user, profile in results:
        next_slot = find_doctor_next_available_slot(db, user.id, max_days_ahead=14)
        items.append(
            DoctorListItem(
                id=user.id,
                full_name=user.full_name,
                email=user.email,
                phone=user.phone,
                speciality=profile.speciality,
                bio=profile.bio,
                qualifications=profile.qualifications,
                years_of_experience=profile.years_of_experience,
                languages=profile.languages or [],
                slot_minutes=profile.slot_minutes,
                consultation_fee=profile.consultation_fee,
                is_active=profile.is_active,
                next_available_slot=next_slot,
            )
        )
    return items


def find_doctor_next_available_slot(
    db: Session,
    doctor_id: int,
    max_days_ahead: int = 14,
    now_utc: datetime | None = None,
) -> GeneratedSlotItem | None:
    """Find the earliest available free slot for a doctor within max_days_ahead."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    start_date = now_utc.astimezone(settings.tz).date()
    for day_offset in range(max_days_ahead + 1):
        target_date = start_date + timedelta(days=day_offset)
        slots_resp = get_doctor_slots_for_date(db, doctor_id, target_date, now_utc=now_utc)
        if slots_resp.slots:
            return slots_resp.slots[0]
    return None


def get_doctor_details(db: Session, doctor_id: int) -> DoctorDetailResponse:
    """Retrieve full doctor profile including availability rules."""
    user = db.scalar(
        select(User)
        .where(User.id == doctor_id, User.role == UserRole.DOCTOR.value)
    )
    if not user or not user.doctor_profile:
        raise AppError(
            status_code=404,
            code="DOCTOR_NOT_FOUND",
            message=f"Doctor with ID {doctor_id} was not found.",
        )

    profile = user.doctor_profile
    rules = db.scalars(
        select(AvailabilityRule)
        .where(AvailabilityRule.doctor_id == doctor_id)
        .order_by(AvailabilityRule.weekday, AvailabilityRule.start_time)
    ).all()

    next_slot = find_doctor_next_available_slot(db, doctor_id, max_days_ahead=14)

    return DoctorDetailResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        speciality=profile.speciality,
        bio=profile.bio,
        qualifications=profile.qualifications,
        years_of_experience=profile.years_of_experience,
        languages=profile.languages or [],
        slot_minutes=profile.slot_minutes,
        consultation_fee=profile.consultation_fee,
        is_active=profile.is_active,
        next_available_slot=next_slot,
        availability_rules=list(rules),
    )


def get_doctor_slots_for_date(
    db: Session,
    doctor_id: int,
    target_date: date,
    now_utc: datetime | None = None,
) -> SlotsResponse:
    """Compute all available free slots for a doctor on a specific date."""
    user = db.scalar(
        select(User).where(User.id == doctor_id, User.role == UserRole.DOCTOR.value)
    )
    if not user or not user.doctor_profile:
        raise AppError(
            status_code=404,
            code="DOCTOR_NOT_FOUND",
            message=f"Doctor with ID {doctor_id} was not found.",
        )

    profile = user.doctor_profile
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    # 1. Check if doctor is on leave
    leave = db.scalar(
        select(DoctorLeave).where(
            DoctorLeave.doctor_id == doctor_id,
            DoctorLeave.date == target_date,
        )
    )
    is_on_leave = leave is not None

    # 2. Query availability windows for target weekday
    weekday = target_date.weekday()
    db_rules = db.scalars(
        select(AvailabilityRule).where(
            AvailabilityRule.doctor_id == doctor_id,
            AvailabilityRule.weekday == weekday,
        )
    ).all()
    windows = [TimeWindow(start_time=r.start_time, end_time=r.end_time) for r in db_rules]

    # 3. Query existing appointments on that date in UTC range
    # In clinic timezone, date spans from target_date 00:00 to target_date+1 00:00
    start_of_day_utc = datetime.combine(target_date, time(0, 0), tzinfo=settings.tz).astimezone(timezone.utc)
    end_of_day_utc = datetime.combine(target_date, time(23, 59, 59, 999999), tzinfo=settings.tz).astimezone(timezone.utc)

    db_appts = db.scalars(
        select(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.start_at >= start_of_day_utc,
            Appointment.start_at <= end_of_day_utc,
            Appointment.status.in_(["booked", "completed", "no_show"]),
        )
    ).all()
    booked_intervals = [
        BookedInterval(start_at=a.start_at, end_at=a.end_at, status=a.status)
        for a in db_appts
    ]

    generated = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=profile.slot_minutes,
        windows_for_day=windows,
        is_on_leave=is_on_leave,
        existing_appointments=booked_intervals,
        now_utc=now_utc,
        clinic_tz=settings.tz,
        buffer_minutes=settings.SLOT_BUFFER_MINUTES,
        booking_window_days=settings.BOOKING_WINDOW_DAYS,
    )

    slot_items = [
        GeneratedSlotItem(
            start_at=s.start_at,
            end_at=s.end_at,
            local_start=s.local_start,
            local_end=s.local_end,
        )
        for s in generated
    ]

    return SlotsResponse(
        doctor_id=doctor_id,
        date=target_date,
        slot_minutes=profile.slot_minutes,
        is_on_leave=is_on_leave,
        leave_reason=leave.reason if leave else None,
        slots=slot_items,
    )


def update_doctor_schedule_and_profile(
    db: Session,
    doctor_id: int,
    payload: UpdateDoctorAvailabilityRequest,
) -> None:
    """Update doctor slot duration and weekly availability windows."""
    user = db.scalar(
        select(User).where(User.id == doctor_id, User.role == UserRole.DOCTOR.value)
    )
    if not user or not user.doctor_profile:
        raise AppError(
            status_code=404,
            code="DOCTOR_NOT_FOUND",
            message=f"Doctor profile with ID {doctor_id} was not found.",
        )

    profile = user.doctor_profile

    # Validate windows for each weekday do not overlap
    for day_schedule in payload.schedule:
        windows = [TimeWindow(w.start_time, w.end_time) for w in day_schedule.windows]
        validate_no_overlapping_windows(windows)

    # Update profile fields
    profile.slot_minutes = payload.slot_minutes
    if payload.bio is not None:
        profile.bio = payload.bio
    if payload.consultation_fee is not None:
        profile.consultation_fee = payload.consultation_fee

    # Delete existing rules and re-insert new rules atomically
    db.query(AvailabilityRule).filter(AvailabilityRule.doctor_id == doctor_id).delete()

    for day_schedule in payload.schedule:
        for win in day_schedule.windows:
            new_rule = AvailabilityRule(
                doctor_id=doctor_id,
                weekday=day_schedule.weekday,
                start_time=win.start_time,
                end_time=win.end_time,
            )
            db.add(new_rule)

    db.commit()


def block_doctor_leave_date(
    db: Session,
    doctor_id: int,
    leave_date: date,
    reason: str | None = None,
) -> DoctorLeave:
    """Block a date as leave. Fails with 409 if active appointments exist."""
    # Check if leave already exists
    existing_leave = db.scalar(
        select(DoctorLeave).where(
            DoctorLeave.doctor_id == doctor_id,
            DoctorLeave.date == leave_date,
        )
    )
    if existing_leave:
        raise AppError(
            status_code=409,
            code="LEAVE_ALREADY_EXISTS",
            message=f"Date {leave_date} is already blocked for this doctor.",
        )

    # Check for active booked appointments on this date
    start_utc = datetime.combine(leave_date, time(0, 0), tzinfo=settings.tz).astimezone(timezone.utc)
    end_utc = datetime.combine(leave_date, time(23, 59, 59, 999999), tzinfo=settings.tz).astimezone(timezone.utc)

    active_count = db.scalar(
        select(func.count(Appointment.id)).where(
            Appointment.doctor_id == doctor_id,
            Appointment.start_at >= start_utc,
            Appointment.start_at <= end_utc,
            Appointment.status == AppointmentStatus.BOOKED.value,
        )
    )

    if active_count and active_count > 0:
        raise AppError(
            status_code=409,
            code="ACTIVE_APPOINTMENTS_ON_LEAVE_DATE",
            message=(
                f"Cannot block {leave_date}: there are {active_count} active booked "
                f"appointment(s) scheduled. Please reschedule or cancel them before blocking this day."
            ),
        )

    new_leave = DoctorLeave(
        doctor_id=doctor_id,
        date=leave_date,
        reason=reason,
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    return new_leave


def unblock_doctor_leave_date(
    db: Session,
    doctor_id: int,
    leave_date: date,
) -> None:
    """Remove a previously blocked leave date."""
    leave = db.scalar(
        select(DoctorLeave).where(
            DoctorLeave.doctor_id == doctor_id,
            DoctorLeave.date == leave_date,
        )
    )
    if not leave:
        raise AppError(
            status_code=404,
            code="LEAVE_NOT_FOUND",
            message=f"No leave record found for date {leave_date}.",
        )

    db.delete(leave)
    db.commit()
