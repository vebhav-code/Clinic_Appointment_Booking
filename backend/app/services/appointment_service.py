"""Appointment management service: transactional booking, atomic reschedule, cancel, and status updates."""

from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.errors import AppError
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import AvailabilityRule
from app.models.user import User, UserRole
from app.schemas.appointment import AppointmentResponse
from app.services.doctor_service import get_doctor_slots_for_date
from app.services.slot_generator import TimeWindow


def _check_cancellation_allowed(start_at: datetime, now_utc: datetime) -> tuple[bool, datetime]:
    """Calculate whether appointment can be cancelled/rescheduled and the exact deadline."""
    deadline = start_at - timedelta(hours=settings.CANCEL_CUTOFF_HOURS)
    can_modify = now_utc <= deadline
    return can_modify, deadline


def _to_appointment_response(appt: Appointment, now_utc: datetime) -> AppointmentResponse:
    """Format an Appointment entity to its public response schema."""
    can_modify, deadline = _check_cancellation_allowed(appt.start_at, now_utc)
    # Only booked appointments can be modified
    if appt.status != AppointmentStatus.BOOKED.value:
        can_modify = False

    return AppointmentResponse(
        id=appt.id,
        patient_id=appt.patient_id,
        patient_name=appt.patient.full_name if appt.patient else "Unknown",
        patient_email=appt.patient.email if appt.patient else "",
        patient_phone=appt.patient.phone if appt.patient else None,
        doctor_id=appt.doctor_id,
        doctor_name=appt.doctor.full_name if appt.doctor else "Unknown",
        doctor_speciality=(
            appt.doctor.doctor_profile.speciality if appt.doctor and appt.doctor.doctor_profile else "General"
        ),
        start_at=appt.start_at,
        end_at=appt.end_at,
        status=appt.status,
        reason=appt.reason,
        patient_notes=appt.patient.patient_notes if appt.patient else None,
        created_at=appt.created_at,
        cancelled_at=appt.cancelled_at,
        can_cancel_or_reschedule=can_modify,
        cancellation_deadline=deadline,
    )


def book_appointment(
    db: Session,
    patient_id: int,
    doctor_id: int,
    start_at: datetime,
    reason: str | None = None,
    now_utc: datetime | None = None,
) -> AppointmentResponse:
    """Book an appointment inside a database transaction with concurrency safeguards.

    1. Validates that requested start_at matches an active generated free slot.
    2. Validates that patient does not hold overlapping active appointments.
    3. Catches exclusion/unique constraint violations from Postgres and returns 409.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    # Ensure start_at is in UTC
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
    else:
        start_at = start_at.astimezone(timezone.utc)

    # Check doctor existence and profile
    doctor = db.scalar(select(User).where(User.id == doctor_id, User.role == UserRole.DOCTOR.value))
    if not doctor or not doctor.doctor_profile:
        raise AppError(
            status_code=404,
            code="DOCTOR_NOT_FOUND",
            message=f"Doctor with ID {doctor_id} was not found.",
        )

    slot_minutes = doctor.doctor_profile.slot_minutes
    end_at = start_at + timedelta(minutes=slot_minutes)

    # Convert start_at to clinic date for slot verification
    target_date = start_at.astimezone(settings.tz).date()

    # Query availability windows for target weekday to verify alignment
    weekday = target_date.weekday()
    db_rules = db.scalars(
        select(AvailabilityRule).where(
            AvailabilityRule.doctor_id == doctor_id,
            AvailabilityRule.weekday == weekday,
        )
    ).all()
    windows = [TimeWindow(start_time=r.start_time, end_time=r.end_time) for r in db_rules]

    # Re-validate that start_at is EXACTLY one of currently generated free slots
    slots_resp = get_doctor_slots_for_date(db, doctor_id, target_date, now_utc=now_utc)
    matching_slot = next(
        (s for s in slots_resp.slots if s.start_at == start_at and s.end_at == end_at),
        None,
    )
    if not matching_slot:
        # Check if it was an aligned window slot that is already booked / taken
        local_start = start_at.astimezone(settings.tz).time()
        local_end = end_at.astimezone(settings.tz).time()
        is_aligned_window = any(
            w.start_time <= local_start
            and local_end <= w.end_time
            and (
                datetime.combine(target_date, local_start) - datetime.combine(target_date, w.start_time)
            ).total_seconds()
            % (slot_minutes * 60)
            == 0
            for w in windows
        )
        if is_aligned_window:
            raise AppError(
                status_code=409,
                code="SLOT_ALREADY_TAKEN",
                message="That slot was just taken. Please pick another.",
            )
        raise AppError(
            status_code=400,
            code="INVALID_SLOT_TIME",
            message="The requested appointment time is not a currently available free slot. Please pick an active slot.",
        )

    # Patient Overlap Check: Prevent patient from having 2 active appointments at the same time
    patient_overlap = db.scalar(
        select(Appointment).where(
            Appointment.patient_id == patient_id,
            Appointment.status.in_(["booked", "completed", "no_show"]),
            Appointment.start_at < end_at,
            Appointment.end_at > start_at,
        )
    )
    if patient_overlap:
        raise AppError(
            status_code=409,
            code="PATIENT_DOUBLE_BOOKING",
            message="You already have an active appointment scheduled during this time window. Overlapping bookings are not allowed.",
        )

    # Transactional insertion with exclusion constraint handling
    try:
        new_appointment = Appointment(
            patient_id=patient_id,
            doctor_id=doctor_id,
            start_at=start_at,
            end_at=end_at,
            status=AppointmentStatus.BOOKED.value,
            reason=reason,
        )
        db.add(new_appointment)
        db.commit()
        db.refresh(new_appointment)
    except IntegrityError as err:
        db.rollback()
        # Postgres exclusion constraint or unique violation
        raise AppError(
            status_code=409,
            code="SLOT_ALREADY_TAKEN",
            message="That slot was just taken. Please pick another.",
        ) from err

    # Reload relationships for response
    refreshed = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(Appointment.id == new_appointment.id)
    )
    return _to_appointment_response(refreshed, now_utc)


def cancel_appointment(
    db: Session,
    appointment_id: int,
    patient_id: int,
    now_utc: datetime | None = None,
) -> AppointmentResponse:
    """Cancel an appointment with 2-hour cutoff rule."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    appt = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(Appointment.id == appointment_id)
        .with_for_update(of=Appointment)
    )
    if not appt:
        raise AppError(
            status_code=404,
            code="APPOINTMENT_NOT_FOUND",
            message=f"Appointment {appointment_id} does not exist.",
        )

    # Server-side authorization check: only owning patient can cancel
    if appt.patient_id != patient_id:
        raise AppError(
            status_code=403,
            code="FORBIDDEN_APPOINTMENT_ACCESS",
            message="You can only cancel your own appointments.",
        )

    if appt.status != AppointmentStatus.BOOKED.value:
        raise AppError(
            status_code=422,
            code="CANNOT_CANCEL_NON_BOOKED",
            message=f"Cannot cancel appointment with status '{appt.status}'. Only booked appointments can be cancelled.",
        )

    # Enforce 2-hour cutoff rule
    can_modify, _ = _check_cancellation_allowed(appt.start_at, now_utc)
    if not can_modify:
        raise AppError(
            status_code=422,
            code="CANCEL_CUTOFF_EXCEEDED",
            message=f"Appointments can't be changed within {settings.CANCEL_CUTOFF_HOURS} hours of the start time.",
        )

    appt.status = AppointmentStatus.CANCELLED.value
    appt.cancelled_at = now_utc
    appt.cancelled_by = patient_id
    db.commit()
    db.refresh(appt)

    return _to_appointment_response(appt, now_utc)


def reschedule_appointment(
    db: Session,
    appointment_id: int,
    patient_id: int,
    new_start_at: datetime,
    reason: str | None = None,
    now_utc: datetime | None = None,
) -> AppointmentResponse:
    """Atomically reschedule an appointment: cancels the old and books the new in a single transaction."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    # Normalize new_start_at to UTC
    if new_start_at.tzinfo is None:
        new_start_at = new_start_at.replace(tzinfo=timezone.utc)
    else:
        new_start_at = new_start_at.astimezone(timezone.utc)

    old_appt = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(Appointment.id == appointment_id)
        .with_for_update(of=Appointment)
    )
    if not old_appt:
        raise AppError(
            status_code=404,
            code="APPOINTMENT_NOT_FOUND",
            message=f"Appointment {appointment_id} does not exist.",
        )

    if old_appt.patient_id != patient_id:
        raise AppError(
            status_code=403,
            code="FORBIDDEN_APPOINTMENT_ACCESS",
            message="You can only reschedule your own appointments.",
        )

    if old_appt.status != AppointmentStatus.BOOKED.value:
        raise AppError(
            status_code=422,
            code="CANNOT_RESCHEDULE_NON_BOOKED",
            message=f"Cannot reschedule appointment with status '{old_appt.status}'.",
        )

    # Enforce 2-hour cutoff rule on the existing appointment
    can_modify, _ = _check_cancellation_allowed(old_appt.start_at, now_utc)
    if not can_modify:
        raise AppError(
            status_code=422,
            code="CANCEL_CUTOFF_EXCEEDED",
            message=f"Appointments can't be changed within {settings.CANCEL_CUTOFF_HOURS} hours of the start time.",
        )

    slot_minutes = old_appt.doctor.doctor_profile.slot_minutes
    new_end_at = new_start_at + timedelta(minutes=slot_minutes)

    # Patient Overlap Check for new slot (ignoring the current appointment being rescheduled)
    patient_overlap = db.scalar(
        select(Appointment).where(
            Appointment.patient_id == patient_id,
            Appointment.id != old_appt.id,
            Appointment.status.in_(["booked", "completed", "no_show"]),
            Appointment.start_at < new_end_at,
            Appointment.end_at > new_start_at,
        )
    )
    if patient_overlap:
        raise AppError(
            status_code=409,
            code="PATIENT_DOUBLE_BOOKING",
            message="You already have another active appointment scheduled during this new time window.",
        )

    # Validate that new_start_at is an available free slot
    target_date = new_start_at.astimezone(settings.tz).date()
    slots_resp = get_doctor_slots_for_date(db, old_appt.doctor_id, target_date, now_utc=now_utc)
    matching_slot = next(
        (s for s in slots_resp.slots if s.start_at == new_start_at and s.end_at == new_end_at),
        None,
    )
    if not matching_slot:
        raise AppError(
            status_code=400,
            code="INVALID_SLOT_TIME",
            message="The requested new appointment time is not a valid available slot.",
        )

    # Execute ATOMIC reschedule: cancel old + insert new in single transaction
    try:
        old_appt.status = AppointmentStatus.CANCELLED.value
        old_appt.cancelled_at = now_utc
        old_appt.cancelled_by = patient_id

        new_appt = Appointment(
            patient_id=patient_id,
            doctor_id=old_appt.doctor_id,
            start_at=new_start_at,
            end_at=new_end_at,
            status=AppointmentStatus.BOOKED.value,
            reason=reason or old_appt.reason,
        )
        db.add(new_appt)
        db.commit()
        db.refresh(new_appt)
    except IntegrityError as err:
        db.rollback()
        raise AppError(
            status_code=409,
            code="SLOT_ALREADY_TAKEN",
            message="That slot was just taken. Please pick another.",
        ) from err

    refreshed = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(Appointment.id == new_appt.id)
    )
    return _to_appointment_response(refreshed, now_utc)


def update_doctor_appointment_status(
    db: Session,
    appointment_id: int,
    doctor_id: int,
    new_status: str,
    now_utc: datetime | None = None,
) -> AppointmentResponse:
    """Doctor marks appointment as completed or no_show.

    Enforces:
    - Only the owning doctor can update status.
    - Status must currently be 'booked'.
    - Appointment must already have started (cannot mark future appointment).
    - Status transition must be to 'completed' or 'no_show'.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    appt = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(Appointment.id == appointment_id)
        .with_for_update(of=Appointment)
    )
    if not appt:
        raise AppError(
            status_code=404,
            code="APPOINTMENT_NOT_FOUND",
            message=f"Appointment {appointment_id} does not exist.",
        )

    if appt.doctor_id != doctor_id:
        raise AppError(
            status_code=403,
            code="FORBIDDEN_APPOINTMENT_ACCESS",
            message="You can only update status for your own appointments.",
        )

    if appt.status != AppointmentStatus.BOOKED.value:
        raise AppError(
            status_code=422,
            code="INVALID_STATUS_TRANSITION",
            message=f"Cannot transition appointment from '{appt.status}' to '{new_status}'. Only booked appointments can be modified.",
        )

    # Reject marking future appointments before start time
    if now_utc < appt.start_at:
        raise AppError(
            status_code=422,
            code="CANNOT_UPDATE_FUTURE_APPOINTMENT",
            message="Cannot mark an appointment as completed or no-show before its scheduled start time.",
        )

    appt.status = new_status
    db.commit()
    db.refresh(appt)

    return _to_appointment_response(appt, now_utc)


def get_patient_upcoming_appointments(
    db: Session,
    patient_id: int,
    now_utc: datetime | None = None,
) -> list[AppointmentResponse]:
    """Retrieve upcoming booked appointments for patient ordered chronologically."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    results = db.scalars(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(
            Appointment.patient_id == patient_id,
            Appointment.status == AppointmentStatus.BOOKED.value,
            Appointment.end_at >= now_utc,
        )
        .order_by(Appointment.start_at.asc())
    ).all()

    return [_to_appointment_response(a, now_utc) for a in results]


def get_patient_past_appointments(
    db: Session,
    patient_id: int,
    now_utc: datetime | None = None,
) -> list[AppointmentResponse]:
    """Retrieve past or concluded/cancelled appointments for patient."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    results = db.scalars(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(
            Appointment.patient_id == patient_id,
            or_(
                Appointment.end_at < now_utc,
                Appointment.status.in_(["completed", "no_show", "cancelled"]),
            ),
        )
        .order_by(Appointment.start_at.desc())
    ).all()

    return [_to_appointment_response(a, now_utc) for a in results]


def get_doctor_appointments_for_date(
    db: Session,
    doctor_id: int,
    target_date: date,
    now_utc: datetime | None = None,
) -> list[AppointmentResponse]:
    """Retrieve all appointments for a doctor on a specific date, ordered by start time."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    start_utc = datetime.combine(target_date, time(0, 0), tzinfo=settings.tz).astimezone(timezone.utc)
    end_utc = datetime.combine(target_date, time(23, 59, 59, 999999), tzinfo=settings.tz).astimezone(timezone.utc)

    results = db.scalars(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.start_at >= start_utc,
            Appointment.start_at <= end_utc,
        )
        .order_by(Appointment.start_at.asc())
    ).all()

    return [_to_appointment_response(a, now_utc) for a in results]


def generate_appointment_ics(db: Session, appointment_id: int, user_id: int) -> str:
    """Generate RFC 5545 iCalendar content for an appointment, ensuring ownership."""
    appt = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor).joinedload(User.doctor_profile),
        )
        .where(Appointment.id == appointment_id)
    )
    if not appt:
        raise AppError(
            status_code=404,
            code="APPOINTMENT_NOT_FOUND",
            message=f"Appointment {appointment_id} does not exist.",
        )

    # Patient or doctor of the appointment can download calendar file
    if appt.patient_id != user_id and appt.doctor_id != user_id:
        raise AppError(
            status_code=403,
            code="FORBIDDEN_CALENDAR_ACCESS",
            message="You can only download calendar files for your own appointments.",
        )

    now_utc_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    start_str = appt.start_at.strftime("%Y%m%dT%H%M%SZ")
    end_str = appt.end_at.strftime("%Y%m%dT%H%M%SZ")
    doctor_name = appt.doctor.full_name if appt.doctor else "Doctor"
    speciality = (
        appt.doctor.doctor_profile.speciality if appt.doctor and appt.doctor.doctor_profile else "General Consultation"
    )
    patient_name = appt.patient.full_name if appt.patient else "Patient"
    reason = appt.reason or "Clinical Consultation"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//PulseClinic//Clinic Appointment Booking//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:pulseclinic-appt-{appt.id}@pulseclinic.internal",
        f"DTSTAMP:{now_utc_str}",
        f"DTSTART:{start_str}",
        f"DTEND:{end_str}",
        f"SUMMARY:Appointment with {doctor_name} ({speciality})",
        f"DESCRIPTION:Patient: {patient_name}. Doctor: {doctor_name}. Reason: {reason}.",
        "LOCATION:PulseClinic Medical Centre",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"
