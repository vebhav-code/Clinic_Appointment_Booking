"""On-demand reminder service for serverless/free-tier hosting without background workers."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.errors import AppError
from app.models.appointment import Appointment, AppointmentStatus, Reminder
from app.models.user import User
from app.schemas.reminder import ReminderItem, ReminderListResponse


def get_and_sync_due_reminders(
    db: Session,
    current_user: User,
    now_utc: datetime | None = None,
) -> ReminderListResponse:
    """Compute and materialize due reminders on-demand.

    Finds upcoming booked appointments starting between now and now+1h.
    Ensures a reminder row exists and returns unread reminders.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    window_end = now_utc + timedelta(hours=1)

    # Find booked appointments for current user starting within the next hour
    due_appointments = db.scalars(
        select(Appointment)
        .options(
            joinedload(Appointment.doctor),
            joinedload(Appointment.patient),
        )
        .where(
            or_(
                Appointment.patient_id == current_user.id,
                Appointment.doctor_id == current_user.id,
            ),
            Appointment.status == AppointmentStatus.BOOKED.value,
            Appointment.start_at >= now_utc,
            Appointment.start_at <= window_end,
        )
    ).all()

    # Materialize reminders if not already created
    for appt in due_appointments:
        existing = db.scalar(
            select(Reminder).where(
                Reminder.appointment_id == appt.id,
                Reminder.user_id == current_user.id,
            )
        )
        if not existing:
            new_reminder = Reminder(
                user_id=current_user.id,
                appointment_id=appt.id,
                remind_at=appt.start_at - timedelta(hours=1),
            )
            db.add(new_reminder)
            db.commit()

    # Fetch all unread reminders for current user
    reminders = db.scalars(
        select(Reminder)
        .options(
            joinedload(Reminder.appointment).joinedload(Appointment.doctor),
            joinedload(Reminder.appointment).joinedload(Appointment.patient),
        )
        .where(
            Reminder.user_id == current_user.id,
            Reminder.read_at.is_(None),
        )
        .order_by(Reminder.remind_at.asc())
    ).all()

    items: list[ReminderItem] = []
    for r in reminders:
        appt = r.appointment
        if not appt:
            continue
        local_time_str = appt.start_at.astimezone(settings.tz).strftime("%I:%M %p")
        doc_name = appt.doctor.full_name if appt.doctor else "Doctor"
        pat_name = appt.patient.full_name if appt.patient else "Patient"

        if current_user.role == "patient":
            title = f"Appointment with {doc_name} in < 1 hour"
            msg = f"Your consultation starts at {local_time_str}. Please be prepared."
        else:
            title = f"Appointment with {pat_name} in < 1 hour"
            msg = f"Consultation with patient {pat_name} starts at {local_time_str}."

        items.append(
            ReminderItem(
                id=r.id,
                appointment_id=appt.id,
                title=title,
                message=msg,
                start_at=appt.start_at,
                remind_at=r.remind_at,
                read_at=r.read_at,
                doctor_name=doc_name,
                patient_name=pat_name,
            )
        )

    return ReminderListResponse(
        unread_count=len(items),
        reminders=items,
    )


def mark_reminder_read(
    db: Session,
    reminder_id: int,
    user_id: int,
    now_utc: datetime | None = None,
) -> None:
    """Mark a reminder as read."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    reminder = db.scalar(
        select(Reminder).where(
            Reminder.id == reminder_id,
            Reminder.user_id == user_id,
        )
    )
    if not reminder:
        raise AppError(
            status_code=404,
            code="REMINDER_NOT_FOUND",
            message=f"Reminder {reminder_id} does not exist or does not belong to you.",
        )

    reminder.read_at = now_utc
    db.commit()
