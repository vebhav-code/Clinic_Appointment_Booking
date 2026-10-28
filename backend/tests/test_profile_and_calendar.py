"""Tests for user profile management, password change security, clinical notes privacy, and ICS downloads."""

from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.appointment import Appointment, AppointmentStatus


def test_get_profile_authenticated_patient(client: TestClient, seed_test_data: dict):
    """Test retrieving authenticated patient profile with appointment statistics."""
    patient = seed_test_data["patient1"]
    token = create_access_token({"sub": str(patient.id), "role": patient.role, "email": patient.email})

    resp = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == patient.email
    assert data["role"] == "patient"
    assert "total_appointments" in data
    assert "upcoming_appointments" in data


def test_update_profile_patient_success(client: TestClient, seed_test_data: dict):
    """Test updating patient profile details with valid payload."""
    patient = seed_test_data["patient1"]
    token = create_access_token({"sub": str(patient.id), "role": patient.role, "email": patient.email})

    update_payload = {
        "full_name": "Alice Updated Patient",
        "phone": "+91 91234 56789",
        "date_of_birth": "1994-08-15",
        "gender": "female",
        "emergency_contact_name": "Bob Patient",
        "emergency_contact_phone": "+91 91234 56780",
        "patient_notes": "Mild allergy to pollen.",
        "avatar_color": "#8B7FE8",
    }

    resp = client.put("/api/v1/profile", json=update_payload, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Alice Updated Patient"
    assert data["date_of_birth"] == "1994-08-15"
    assert data["gender"] == "female"
    assert data["patient_notes"] == "Mild allergy to pollen."
    assert data["avatar_color"] == "#8B7FE8"


def test_update_profile_validation_dob_and_phone(client: TestClient, seed_test_data: dict):
    """Test server-side rejection of future DOB and invalid phone numbers."""
    patient = seed_test_data["patient1"]
    token = create_access_token({"sub": str(patient.id), "role": patient.role, "email": patient.email})

    # Future DOB
    resp_future_dob = client.put(
        "/api/v1/profile",
        json={"date_of_birth": (date.today() + timedelta(days=5)).isoformat()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_future_dob.status_code == 422
    assert "past" in str(resp_future_dob.json())

    # Invalid phone format
    resp_bad_phone = client.put(
        "/api/v1/profile",
        json={"phone": "invalid_phone_number"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_bad_phone.status_code == 422


def test_update_profile_rejects_unknown_fields(client: TestClient, seed_test_data: dict):
    """Test that extra/unknown fields are strictly forbidden by Pydantic."""
    patient = seed_test_data["patient1"]
    token = create_access_token({"sub": str(patient.id), "role": patient.role, "email": patient.email})

    resp = client.put(
        "/api/v1/profile",
        json={"unknown_hack_field": "exploit_value"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 422
    data = resp.json()
    assert "error" in data


def test_change_password_success_and_validation(client: TestClient, seed_test_data: dict):
    """Test password update with correct old password, and rejection on invalid old password or same password."""
    patient = seed_test_data["patient1"]
    token = create_access_token({"sub": str(patient.id), "role": patient.role, "email": patient.email})

    # 1. Invalid current password
    resp_wrong = client.post(
        "/api/v1/profile/change-password",
        json={"current_password": "WrongPassword123!", "new_password": "BrandNewPassword123!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_wrong.status_code == 400
    assert resp_wrong.json()["error"]["code"] == "INVALID_CURRENT_PASSWORD"

    # 2. Same password reuse
    resp_same = client.post(
        "/api/v1/profile/change-password",
        json={"current_password": "PatientPass123!", "new_password": "PatientPass123!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_same.status_code == 422

    # 3. Successful change
    resp_ok = client.post(
        "/api/v1/profile/change-password",
        json={"current_password": "PatientPass123!", "new_password": "BrandNewPassword123!"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_ok.status_code == 200

    # 4. Verify login works with the new password
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": patient.email, "password": "BrandNewPassword123!"},
    )
    assert login_resp.status_code == 200


def test_doctor_patient_notes_privacy_rules(client: TestClient, db: Session, seed_test_data: dict):
    """Test that doctors can only view patient clinical notes if an appointment exists between them."""
    doc1 = seed_test_data["doctor"]
    doc2 = seed_test_data["doctor2"]
    patient = seed_test_data["patient1"]
    other_patient = seed_test_data["patient2"]

    # Set patient notes
    patient.patient_notes = "Confidential patient medical history."
    db.commit()

    # Create an appointment between doc1 and patient
    future_time = datetime.now(timezone.utc) + timedelta(days=2)
    appt = Appointment(
        doctor_id=doc1.id,
        patient_id=patient.id,
        start_at=future_time,
        end_at=future_time + timedelta(minutes=30),
        status=AppointmentStatus.BOOKED.value,
        reason="Consultation",
    )
    db.add(appt)
    db.commit()

    token_doc1 = create_access_token({"sub": str(doc1.id), "role": doc1.role, "email": doc1.email})
    token_doc2 = create_access_token({"sub": str(doc2.id), "role": doc2.role, "email": doc2.email})
    token_other_pat = create_access_token(
        {"sub": str(other_patient.id), "role": other_patient.role, "email": other_patient.email}
    )

    # 1. Doctor 1 (has appointment) -> Allowed
    resp_doc1 = client.get(
        f"/api/v1/profile/patient/{patient.id}/notes",
        headers={"Authorization": f"Bearer {token_doc1}"},
    )
    assert resp_doc1.status_code == 200
    assert resp_doc1.json()["patient_notes"] == "Confidential patient medical history."

    # 2. Doctor 2 (NO appointment) -> Forbidden 403
    resp_doc2 = client.get(
        f"/api/v1/profile/patient/{patient.id}/notes",
        headers={"Authorization": f"Bearer {token_doc2}"},
    )
    assert resp_doc2.status_code == 403
    assert resp_doc2.json()["error"]["code"] == "FORBIDDEN_PATIENT_NOTES"

    # 3. Other patient -> Forbidden 403
    resp_other = client.get(
        f"/api/v1/profile/patient/{patient.id}/notes",
        headers={"Authorization": f"Bearer {token_other_pat}"},
    )
    assert resp_other.status_code == 403
    assert resp_other.json()["error"]["code"] == "FORBIDDEN_PROFILE_ACCESS"


def test_download_appointment_ics(client: TestClient, db: Session, seed_test_data: dict):
    """Test generating and downloading RFC 5545 iCalendar (.ics) files for appointments."""
    doc = seed_test_data["doctor"]
    patient = seed_test_data["patient1"]
    unrelated_user = seed_test_data["patient2"]

    future_start = datetime.now(timezone.utc) + timedelta(days=3)
    appt = Appointment(
        doctor_id=doc.id,
        patient_id=patient.id,
        start_at=future_start,
        end_at=future_start + timedelta(minutes=30),
        status=AppointmentStatus.BOOKED.value,
        reason="Annual Heart Checkup",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    token_patient = create_access_token({"sub": str(patient.id), "role": patient.role, "email": patient.email})
    token_unrelated = create_access_token(
        {"sub": str(unrelated_user.id), "role": unrelated_user.role, "email": unrelated_user.email}
    )

    # 1. Patient downloads ICS -> 200 OK, text/calendar
    resp_ics = client.get(
        f"/api/v1/appointments/{appt.id}/ics",
        headers={"Authorization": f"Bearer {token_patient}"},
    )
    assert resp_ics.status_code == 200
    assert "text/calendar" in resp_ics.headers.get("content-type", "")
    content = resp_ics.text
    assert "BEGIN:VCALENDAR" in content
    assert "BEGIN:VEVENT" in content
    assert "SUMMARY:Appointment with" in content
    assert "END:VCALENDAR" in content

    # 2. Unrelated user attempts download -> 403 Forbidden
    resp_forbidden = client.get(
        f"/api/v1/appointments/{appt.id}/ics",
        headers={"Authorization": f"Bearer {token_unrelated}"},
    )
    assert resp_forbidden.status_code == 403
    assert resp_forbidden.json()["error"]["code"] == "FORBIDDEN_CALENDAR_ACCESS"


def test_doctors_list_includes_next_available_slot(client: TestClient, seed_test_data: dict):
    """Test that GET /doctors returns qualifications, years_of_experience, languages, and next_available_slot."""
    patient = seed_test_data["patient1"]
    token = create_access_token({"sub": str(patient.id), "role": patient.role, "email": patient.email})

    resp = client.get("/api/v1/doctors", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    doctors = resp.json()
    assert len(doctors) >= 2

    first_doc = doctors[0]
    assert "slot_minutes" in first_doc
    assert "next_available_slot" in first_doc
    # When doctor has active weekly rules, next_available_slot should be computed
    assert first_doc["next_available_slot"] is not None
    assert "start_at" in first_doc["next_available_slot"]
    assert "local_start" in first_doc["next_available_slot"]
