"""Tests for in-app reminders endpoint."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from freezegun import freeze_time
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.appointment import Appointment, AppointmentStatus


def test_reminders_due_within_one_hour(client: TestClient, seed_test_data: dict, db: Session):
    """Appointments within the next hour generate in-app reminders; appointments far ahead do not."""
    doc = seed_test_data["doctor"]
    p1 = seed_test_data["patient1"]
    p1_token = seed_test_data["patient1_token"]

    # Current frozen time: 10:00 AM UTC
    freeze_point = "2026-11-12 10:00:00"

    with freeze_time(freeze_point):
        now_utc = datetime(2026, 11, 12, 10, 0, tzinfo=timezone.utc)
        # Appointment A: in 45 minutes (due!)
        appt_due = Appointment(
            patient_id=p1.id,
            doctor_id=doc.id,
            start_at=now_utc + timedelta(minutes=45),
            end_at=now_utc + timedelta(minutes=75),
            status=AppointmentStatus.BOOKED.value,
            reason="Upcoming due checkup",
        )
        # Appointment B: in 4 hours (not due yet)
        appt_future = Appointment(
            patient_id=p1.id,
            doctor_id=doc.id,
            start_at=now_utc + timedelta(hours=4),
            end_at=now_utc + timedelta(hours=4, minutes=30),
            status=AppointmentStatus.BOOKED.value,
            reason="Far future checkup",
        )
        db.add_all([appt_due, appt_future])
        db.commit()

        # Token created under frozen time
        tok = create_access_token({"sub": str(p1.id), "role": p1.role, "email": p1.email})

        # Fetch reminders
        resp = client.get(
            "/api/v1/reminders",
            headers={"Authorization": f"Bearer {tok}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["unread_count"] >= 1

        rem_ids = [r["appointment_id"] for r in data["reminders"]]
        assert appt_due.id in rem_ids
        assert appt_future.id not in rem_ids

        # Mark reminder as read
        due_rem_id = next(r["id"] for r in data["reminders"] if r["appointment_id"] == appt_due.id)
        r_read = client.post(
            f"/api/v1/reminders/{due_rem_id}/read",
            headers={"Authorization": f"Bearer {tok}"},
        )
        assert r_read.status_code == 200

        # Verify unread count decreases
        resp2 = client.get(
            "/api/v1/reminders",
            headers={"Authorization": f"Bearer {tok}"},
        )
        assert resp2.status_code == 200
        rem_ids_after = [r["appointment_id"] for r in resp2.json()["reminders"]]
        assert appt_due.id not in rem_ids_after
