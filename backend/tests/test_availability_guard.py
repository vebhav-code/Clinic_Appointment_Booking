"""Tests for doctor availability schedule updates and conflicts with existing booked appointments."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.appointment import Appointment, AppointmentStatus


def test_update_availability_rejected_when_conflicts_with_existing_bookings(
    client: TestClient,
    seed_test_data: dict,
    db: Session,
):
    """Doctor schedule update must be rejected with 409 if future booked appointments would be orphaned or misaligned."""
    doc = seed_test_data["doctor"]
    doc_token = seed_test_data["doctor_token"]
    patient = seed_test_data["patient1"]

    # Book an appointment 5 days in the future (Monday to Saturday window at 10:00-10:30 IST)
    future_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=5)).date()
    # Find weekday for future_date
    target_weekday = future_date.weekday()

    slot_local_start = datetime(future_date.year, future_date.month, future_date.day, 10, 0, tzinfo=settings.tz)
    slot_local_end = datetime(future_date.year, future_date.month, future_date.day, 10, 30, tzinfo=settings.tz)
    start_utc = slot_local_start.astimezone(timezone.utc)
    end_utc = slot_local_end.astimezone(timezone.utc)

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doc.id,
        start_at=start_utc,
        end_at=end_utc,
        status=AppointmentStatus.BOOKED.value,
        reason="Checkup before schedule change",
    )
    db.add(appt)
    db.commit()

    # Attempt 1: Change slot_minutes from 30 to 15 (which misaligns the existing 30m appointment)
    payload_mismatched_duration = {
        "slot_minutes": 15,
        "consultation_fee": 650.0,
        "schedule": [
            {
                "weekday": target_weekday,
                "windows": [{"start_time": "10:00:00", "end_time": "13:00:00"}],
            }
        ],
    }

    resp = client.put(
        "/api/v1/doctor/availability",
        json=payload_mismatched_duration,
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert resp.status_code == 409
    data = resp.json()
    assert data["error"]["code"] == "AVAILABILITY_CONFLICTS_WITH_BOOKINGS"
    assert "future booked appointment" in data["error"]["message"].lower()

    # Attempt 2: Keep slot_minutes at 30, but shift window so the appointment is outside (11:00-14:00)
    payload_shifted_window = {
        "slot_minutes": 30,
        "consultation_fee": 650.0,
        "schedule": [
            {
                "weekday": target_weekday,
                "windows": [{"start_time": "11:00:00", "end_time": "14:00:00"}],
            }
        ],
    }

    resp2 = client.put(
        "/api/v1/doctor/availability",
        json=payload_shifted_window,
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert resp2.status_code == 409
    data2 = resp2.json()
    assert data2["error"]["code"] == "AVAILABILITY_CONFLICTS_WITH_BOOKINGS"
    assert "future booked appointment" in data2["error"]["message"].lower()


def test_update_availability_allowed_when_no_conflicts(
    client: TestClient,
    seed_test_data: dict,
    db: Session,
):
    """Doctor schedule update succeeds when existing appointments remain aligned within windows."""
    doc = seed_test_data["doctor"]
    doc_token = seed_test_data["doctor_token"]
    patient = seed_test_data["patient1"]

    # Book an appointment 5 days in the future at 10:00-10:30 IST
    future_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=5)).date()
    target_weekday = future_date.weekday()

    slot_local_start = datetime(future_date.year, future_date.month, future_date.day, 10, 0, tzinfo=settings.tz)
    slot_local_end = datetime(future_date.year, future_date.month, future_date.day, 10, 30, tzinfo=settings.tz)
    start_utc = slot_local_start.astimezone(timezone.utc)
    end_utc = slot_local_end.astimezone(timezone.utc)

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doc.id,
        start_at=start_utc,
        end_at=end_utc,
        status=AppointmentStatus.BOOKED.value,
        reason="Aligned checkup",
    )
    db.add(appt)
    db.commit()

    # Update schedule: Keep slot_minutes=30 and window covering 10:00-13:00 plus add an evening window
    payload_valid = {
        "slot_minutes": 30,
        "consultation_fee": 700.0,
        "schedule": [
            {
                "weekday": target_weekday,
                "windows": [
                    {"start_time": "10:00:00", "end_time": "13:00:00"},
                    {"start_time": "17:00:00", "end_time": "20:00:00"},
                ],
            }
        ],
    }

    resp = client.put(
        "/api/v1/doctor/availability",
        json=payload_valid,
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Availability schedule updated successfully."

