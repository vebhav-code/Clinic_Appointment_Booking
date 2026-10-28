"""CLI command to dispatch email reminders for upcoming appointments idempotently.

Usage:
    python -m app.send_reminders

Behavior:
    - Finds active booked appointments starting in the next 1 hour where
      email_reminder_sent_at is NULL.
    - If EMAIL_REMINDERS_ENABLED=true and SMTP settings are configured, dispatches
      an email notification via SMTP to the patient and marks email_reminder_sent_at.
    - Idempotent: Never sends duplicate reminders for the same appointment.
    - Resilient: Never crashes if SMTP is unset or server is unreachable.
"""

import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("send_reminders")


def send_appointment_reminder_email(
    to_email: str,
    patient_name: str,
    doctor_name: str,
    speciality: str,
    start_at_local_str: str,
) -> bool:
    """Send reminder email via SMTP. Returns True on success, False on failure."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP_HOST is not configured; cannot deliver email reminder.")
        return False

    sender = settings.SMTP_FROM_EMAIL or "no-reply@clinic.example.com"
    subject = f"Reminder: Your appointment with {doctor_name} starts soon"

    text_body = f"""Hello {patient_name},

This is a friendly reminder that your upcoming appointment with {doctor_name} ({speciality}) is scheduled in less than 1 hour at {start_at_local_str} ({settings.CLINIC_TIMEZONE}).

Please be prepared 5-10 minutes prior to your slot.

Best regards,
Clinic Care Team
"""

    html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family: Inter, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0d9488; margin-top: 0;">Appointment Reminder</h2>
    <p>Hello <strong>{patient_name}</strong>,</p>
    <p>Your upcoming appointment is scheduled in less than 1 hour:</p>
    <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 6px 0;"><strong>Doctor:</strong> {doctor_name} ({speciality})</p>
      <p style="margin: 0;"><strong>Time:</strong> {start_at_local_str} ({settings.CLINIC_TIMEZONE})</p>
    </div>
    <p style="color: #64748b; font-size: 14px;">Please be available 5 minutes prior to your consultation.</p>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.send_message(msg)
        server.quit()
        logger.info("Successfully sent reminder email to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Failed to deliver reminder email to %s: %s", to_email, exc)
        return False


def process_reminders() -> int:
    """Find and send due email reminders. Returns count of emails successfully sent."""
    now_utc = datetime.now(timezone.utc)
    window_end = now_utc + timedelta(hours=1)

    db = SessionLocal()
    sent_count = 0

    try:
        # Find active booked appointments within 1 hour where reminder hasn't been sent yet
        due_appointments = db.scalars(
            select(Appointment)
            .options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor).joinedload(User.doctor_profile),
            )
            .where(
                Appointment.status == AppointmentStatus.BOOKED.value,
                Appointment.email_reminder_sent_at.is_(None),
                Appointment.start_at >= now_utc,
                Appointment.start_at <= window_end,
            )
        ).all()

        logger.info("Found %d appointment(s) due for email reminders", len(due_appointments))

        if not due_appointments:
            return 0

        if not settings.EMAIL_REMINDERS_ENABLED:
            logger.info("EMAIL_REMINDERS_ENABLED is False; skipping dispatch.")
            return 0

        for appt in due_appointments:
            patient = appt.patient
            doctor = appt.doctor
            if not patient or not patient.email:
                continue

            doc_name = doctor.full_name if doctor else "Doctor"
            speciality = doctor.doctor_profile.speciality if doctor and doctor.doctor_profile else "Specialist"
            local_time_str = appt.start_at.astimezone(settings.tz).strftime("%B %d, %Y at %I:%M %p")

            success = send_appointment_reminder_email(
                to_email=patient.email,
                patient_name=patient.full_name,
                doctor_name=doc_name,
                speciality=speciality,
                start_at_local_str=local_time_str,
            )

            if success:
                appt.email_reminder_sent_at = datetime.now(timezone.utc)
                db.commit()
                sent_count += 1

    except Exception as exc:
        logger.error("Unexpected error in reminder processing loop: %s", exc)
    finally:
        db.close()

    return sent_count


def main():
    """Main CLI entrypoint."""
    logger.info("Starting appointment reminder delivery job...")
    sent = process_reminders()
    logger.info("Finished reminder delivery job. Total sent: %d", sent)


if __name__ == "__main__":
    main()
