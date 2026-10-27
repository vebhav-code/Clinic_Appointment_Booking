"""Real PostgreSQL concurrency and business rule integration tests.

Verifies:
1. N simultaneous booking requests for the same slot yield exactly 1 success (201) and all others 409.
2. Booking a misaligned/non-generated time is rejected with 400.
3. Patient overlapping-appointment rejection (409) with different doctors.
4. Cancellation 2-hour cutoff rule (allowed at 3h, rejected at 1h59m).
5. Cancelled slot becomes bookable again.
6. Atomic reschedule: failed new booking leaves the old appointment intact.
7. Doctor status transitions: must be booked, cannot mark future appointment.
8. Role permission enforcement: patient cannot access doctor endpoints.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from freezegun import freeze_time
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole


def test_concurrent_booking_for_same_slot(client: TestClient, seed_test_data: dict, db: Session):
    """Fire 10 simultaneous booking requests from 10 distinct patients for the exact same slot.

    Asserts exactly ONE succeeds (201) and the other 9 receive 409 Conflict.
    """
    doc = seed_test_data["doctor"]

    # Choose a future date within booking window
    future_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=5)).date()
    slot_local = datetime(future_date.year, future_date.month, future_date.day, 10, 0, tzinfo=settings.tz)
    slot_utc = slot_local.astimezone(timezone.utc)
    slot_utc_iso = slot_utc.isoformat()

    num_threads = 10

    # Create 10 distinct test patients and tokens
    patient_tokens = []
    for i in range(num_threads):
        email = f"test_race_pat_{i}@clinic.com"
        existing = db.scalar(select(User).where(User.email == email))
        if not existing:
            p = User(
                email=email,
                password_hash=get_password_hash("Pass123!"),
                full_name=f"Race Patient {i}",
                role=UserRole.PATIENT.value,
            )
            db.add(p)
            db.commit()
            db.refresh(p)
        else:
            p = existing

        tok = create_access_token({"sub": str(p.id), "role": p.role, "email": p.email})
        patient_tokens.append(tok)

    payload = {
        "doctor_id": doc.id,
        "start_at": slot_utc_iso,
        "reason": "Concurrency test booking",
    }

    def make_booking_request(token):
        with TestClient(client.app) as c:
            return c.post(
                "/api/v1/appointments",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
            )

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        responses = list(executor.map(make_booking_request, patient_tokens))

    status_codes = [r.status_code for r in responses]
    successes = [code for code in status_codes if code == 201]
    conflicts = [code for code in status_codes if code == 409]

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}: {status_codes}"
    assert len(conflicts) == num_threads - 1, f"Expected {num_threads - 1} 409s, got {len(conflicts)}"

    conflict_resp = next(r for r in responses if r.status_code == 409).json()
    assert "error" in conflict_resp
    assert conflict_resp["error"]["code"] in ("SLOT_ALREADY_TAKEN", "PATIENT_DOUBLE_BOOKING")


def test_booking_misaligned_time_rejected(client: TestClient, seed_test_data: dict):
    """Booking a slot at 10:17 (not a generated slot) is rejected with 400."""
    doc = seed_test_data["doctor"]
    p1_token = seed_test_data["patient1_token"]

    future_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=5)).date()
    misaligned_local = datetime(future_date.year, future_date.month, future_date.day, 10, 17, tzinfo=settings.tz)
    misaligned_utc = misaligned_local.astimezone(timezone.utc).isoformat()

    resp = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doc.id, "start_at": misaligned_utc, "reason": "Misaligned test"},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "INVALID_SLOT_TIME"


def test_patient_overlapping_appointment_rejected(client: TestClient, seed_test_data: dict):
    """A patient cannot book two overlapping appointments even with different doctors."""
    doc1 = seed_test_data["doctor"]
    doc2 = seed_test_data["doctor2"]
    p1_token = seed_test_data["patient1_token"]

    future_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=6)).date()
    slot_utc = datetime(future_date.year, future_date.month, future_date.day, 10, 0, tzinfo=settings.tz).astimezone(timezone.utc)

    # First booking with Doctor 1 succeeds
    r1 = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doc1.id, "start_at": slot_utc.isoformat()},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert r1.status_code == 201

    # Second booking for the same time window with Doctor 2 must be rejected with 409 PATIENT_DOUBLE_BOOKING
    r2 = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doc2.id, "start_at": slot_utc.isoformat()},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert r2.status_code == 409
    assert r2.json()["error"]["code"] == "PATIENT_DOUBLE_BOOKING"


def test_cancellation_cutoff_freeze_time(client: TestClient, seed_test_data: dict):
    """Cancellation allowed at 3h before start; rejected at 1h59m before start."""
    doc = seed_test_data["doctor"]
    p1 = seed_test_data["patient1"]

    # Appointment at 12:00 PM IST on Nov 15
    appt_start_local = datetime(2026, 11, 15, 12, 0, tzinfo=settings.tz)
    appt_start_utc = appt_start_local.astimezone(timezone.utc)

    # Book the slot while frozen on Nov 10 (issue token at frozen time)
    with freeze_time("2026-11-10 10:00:00"):
        tok = create_access_token({"sub": str(p1.id), "role": p1.role, "email": p1.email})
        r = client.post(
            "/api/v1/appointments",
            json={"doctor_id": doc.id, "start_at": appt_start_utc.isoformat()},
            headers={"Authorization": f"Bearer {tok}"},
        )
        assert r.status_code == 201
        appt_id = r.json()["id"]

    # Try cancelling 1 hour 59 minutes before start (cutoff is 2 hours -> must be rejected)
    time_1h59m_before = appt_start_utc - timedelta(hours=1, minutes=59)
    with freeze_time(time_1h59m_before):
        tok_1h59m = create_access_token({"sub": str(p1.id), "role": p1.role, "email": p1.email})
        r_fail = client.post(
            f"/api/v1/appointments/{appt_id}/cancel",
            headers={"Authorization": f"Bearer {tok_1h59m}"},
        )
        assert r_fail.status_code == 422
        assert r_fail.json()["error"]["code"] == "CANCEL_CUTOFF_EXCEEDED"

    # Try cancelling 3 hours before start -> must be allowed
    time_3h_before = appt_start_utc - timedelta(hours=3)
    with freeze_time(time_3h_before):
        tok_3h = create_access_token({"sub": str(p1.id), "role": p1.role, "email": p1.email})
        r_ok = client.post(
            f"/api/v1/appointments/{appt_id}/cancel",
            headers={"Authorization": f"Bearer {tok_3h}"},
        )
        assert r_ok.status_code == 200
        assert r_ok.json()["status"] == "cancelled"


def test_cancelled_slot_becomes_bookable_again(client: TestClient, seed_test_data: dict):
    """Once an appointment is cancelled, another patient can book that exact slot."""
    doc = seed_test_data["doctor"]
    p1_token = seed_test_data["patient1_token"]
    p2_token = seed_test_data["patient2_token"]

    future_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=7)).date()
    slot_utc = datetime(future_date.year, future_date.month, future_date.day, 11, 0, tzinfo=settings.tz).astimezone(timezone.utc)

    # Patient 1 books
    r1 = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doc.id, "start_at": slot_utc.isoformat()},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert r1.status_code == 201
    appt_id = r1.json()["id"]

    # Patient 1 cancels
    r_cancel = client.post(
        f"/api/v1/appointments/{appt_id}/cancel",
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert r_cancel.status_code == 200

    # Patient 2 books the now-freed slot -> succeeds!
    r2 = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doc.id, "start_at": slot_utc.isoformat()},
        headers={"Authorization": f"Bearer {p2_token}"},
    )
    assert r2.status_code == 201
    assert r2.json()["status"] == "booked"


def test_atomic_reschedule_leaves_old_intact_if_new_fails(client: TestClient, seed_test_data: dict, db: Session):
    """Atomic reschedule: if target slot fails validation, old appointment remains booked."""
    doc = seed_test_data["doctor"]
    p1_token = seed_test_data["patient1_token"]

    future_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=8)).date()
    slot1_utc = datetime(future_date.year, future_date.month, future_date.day, 10, 0, tzinfo=settings.tz).astimezone(timezone.utc)

    # Book slot 1
    r1 = client.post(
        "/api/v1/appointments",
        json={"doctor_id": doc.id, "start_at": slot1_utc.isoformat()},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert r1.status_code == 201
    appt_id = r1.json()["id"]

    # Attempt to reschedule to an invalid / non-existent time (e.g. 03:00 AM)
    invalid_new_slot = datetime(future_date.year, future_date.month, future_date.day, 3, 0, tzinfo=settings.tz).astimezone(timezone.utc)

    r_resched_fail = client.post(
        f"/api/v1/appointments/{appt_id}/reschedule",
        json={"new_start_at": invalid_new_slot.isoformat()},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert r_resched_fail.status_code == 400

    # Verify that the original appointment is STILL booked!
    db.expire_all()
    old = db.scalar(select(Appointment).where(Appointment.id == appt_id))
    assert old.status == AppointmentStatus.BOOKED.value


def test_doctor_status_transition_rules(client: TestClient, seed_test_data: dict):
    """Doctor can only mark appointments completed or no_show after start_at."""
    doc = seed_test_data["doctor"]
    p1 = seed_test_data["patient1"]

    # 10:00 AM IST on Nov 20 is within the doctor's 10:00-13:00 window
    appt_start_local = datetime(2026, 11, 20, 10, 0, tzinfo=settings.tz)
    appt_start_utc = appt_start_local.astimezone(timezone.utc)

    with freeze_time("2026-11-10 10:00:00"):
        p1_tok = create_access_token({"sub": str(p1.id), "role": p1.role, "email": p1.email})
        r_book = client.post(
            "/api/v1/appointments",
            json={"doctor_id": doc.id, "start_at": appt_start_utc.isoformat()},
            headers={"Authorization": f"Bearer {p1_tok}"},
        )
        assert r_book.status_code == 201
        appt_id = r_book.json()["id"]

    # Doctor tries to mark future appointment as completed before start -> rejected (422)
    with freeze_time("2026-11-15 10:00:00"):
        doc_tok_future = create_access_token({"sub": str(doc.id), "role": doc.role, "email": doc.email})
        r_future = client.patch(
            f"/api/v1/doctor/appointments/{appt_id}/status",
            json={"status": "completed"},
            headers={"Authorization": f"Bearer {doc_tok_future}"},
        )
        assert r_future.status_code == 422
        assert r_future.json()["error"]["code"] == "CANNOT_UPDATE_FUTURE_APPOINTMENT"

    # Doctor marks as completed on or after start time -> succeeds (200)
    with freeze_time("2026-11-20 10:05:00"):
        doc_tok_now = create_access_token({"sub": str(doc.id), "role": doc.role, "email": doc.email})
        r_done = client.patch(
            f"/api/v1/doctor/appointments/{appt_id}/status",
            json={"status": "completed"},
            headers={"Authorization": f"Bearer {doc_tok_now}"},
        )
        assert r_done.status_code == 200
        assert r_done.json()["status"] == "completed"

    # Doctor cannot mark an already completed appointment as no_show (invalid transition)
    with freeze_time("2026-11-20 10:10:00"):
        doc_tok_after = create_access_token({"sub": str(doc.id), "role": doc.role, "email": doc.email})
        r_invalid = client.patch(
            f"/api/v1/doctor/appointments/{appt_id}/status",
            json={"status": "no_show"},
            headers={"Authorization": f"Bearer {doc_tok_after}"},
        )
        assert r_invalid.status_code == 422


def test_role_permissions_enforced(client: TestClient, seed_test_data: dict):
    """Patient cannot hit doctor-only endpoints; doctor cannot book patient appointments."""
    p1_token = seed_test_data["patient1_token"]
    doc_token = seed_test_data["doctor_token"]

    # Patient tries to call doctor availability update
    r1 = client.put(
        "/api/v1/doctor/availability",
        json={"slot_minutes": 30, "schedule": []},
        headers={"Authorization": f"Bearer {p1_token}"},
    )
    assert r1.status_code == 403
    assert r1.json()["error"]["code"] == "FORBIDDEN_ROLE"

    # Doctor tries to book an appointment (only patients book)
    r2 = client.post(
        "/api/v1/appointments",
        json={"doctor_id": seed_test_data["doctor"].id, "start_at": "2026-11-20T10:00:00Z"},
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert r2.status_code == 403
    assert r2.json()["error"]["code"] == "FORBIDDEN_ROLE"
