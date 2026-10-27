"""Idempotent database seeder for doctors, patients, schedules, appointments, and leaves.

Run via:
    python -m app.seed
"""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.appointment import Appointment, AppointmentStatus, Reminder
from app.models.doctor import AvailabilityRule, DoctorLeave, DoctorProfile
from app.models.user import User, UserRole

DEMO_PASSWORD = "DemoPassword123!"

DOCTORS_SEED = [
    {
        "email": "dr.sharma@clinic.com",
        "full_name": "Dr. Arvind Sharma",
        "phone": "+91 98201 11223",
        "speciality": "General Physician",
        "bio": "Senior family physician with 18+ years of experience in preventive medicine and chronic care management.",
        "slot_minutes": 15,
        "consultation_fee": 400.00,
        "days": [0, 1, 2, 3, 4, 5],  # Mon - Sat
        "windows": [(time(9, 0), time(12, 30)), (time(16, 30), time(19, 30))],
    },
    {
        "email": "dr.nair@clinic.com",
        "full_name": "Dr. Priya Nair",
        "phone": "+91 98202 22334",
        "speciality": "Dermatologist",
        "bio": "Consultant dermatologist specialising in clinical dermatology, laser aesthetics, and pediatric skin care.",
        "slot_minutes": 30,
        "consultation_fee": 650.00,
        "days": [0, 1, 2, 3, 4],  # Mon - Fri
        "windows": [(time(10, 0), time(13, 0)), (time(17, 0), time(20, 0))],
    },
    {
        "email": "dr.kothari@clinic.com",
        "full_name": "Dr. Rajesh Kothari",
        "phone": "+91 98203 33445",
        "speciality": "Cardiologist",
        "bio": "Interventional cardiologist and researcher with expertise in hypertension, lipidology, and cardiovascular rehabilitation.",
        "slot_minutes": 30,
        "consultation_fee": 900.00,
        "days": [0, 1, 2, 3, 4, 5],  # Mon - Sat
        "windows": [(time(10, 30), time(13, 30)), (time(18, 0), time(21, 0))],
    },
    {
        "email": "dr.desai@clinic.com",
        "full_name": "Dr. Meera Desai",
        "phone": "+91 98204 44556",
        "speciality": "Pediatrician",
        "bio": "Dedicated child specialist focusing on neonatal care, adolescent health, and developmental pediatrics.",
        "slot_minutes": 30,
        "consultation_fee": 500.00,
        "days": [1, 2, 3, 4, 5, 6],  # Tue - Sun
        "windows": [(time(9, 30), time(13, 0)), (time(16, 0), time(19, 0))],
    },
]

PATIENTS_SEED = [
    {
        "email": "rohan.patient@example.com",
        "full_name": "Rohan Verma",
        "phone": "+91 97111 00111",
    },
    {
        "email": "ananya.patient@example.com",
        "full_name": "Ananya Iyer",
        "phone": "+91 97112 00222",
    },
    {
        "email": "vikram.patient@example.com",
        "full_name": "Vikram Malhotra",
        "phone": "+91 97113 00333",
    },
]


def seed_database(db: Session) -> None:
    """Execute idempotent database seeding."""
    print("[SEED] Starting database seed...")

    # 1. Seed Doctors & Availability
    created_doctors: dict[str, User] = {}
    for doc_data in DOCTORS_SEED:
        doc = db.scalar(select(User).where(User.email == doc_data["email"]))
        if not doc:
            doc = User(
                email=doc_data["email"],
                password_hash=get_password_hash(DEMO_PASSWORD),
                full_name=doc_data["full_name"],
                role=UserRole.DOCTOR.value,
                phone=doc_data["phone"],
            )
            db.add(doc)
            db.flush()
            print(f"  + Created Doctor: {doc.full_name} ({doc.email})")

        created_doctors[doc.email] = doc

        # Profile
        profile = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == doc.id))
        if not profile:
            profile = DoctorProfile(
                user_id=doc.id,
                speciality=doc_data["speciality"],
                bio=doc_data["bio"],
                slot_minutes=doc_data["slot_minutes"],
                consultation_fee=doc_data["consultation_fee"],
                is_active=True,
            )
            db.add(profile)
            db.flush()

        # Rules
        existing_rules = db.scalars(
            select(AvailabilityRule).where(AvailabilityRule.doctor_id == doc.id)
        ).all()
        if not existing_rules:
            for day in doc_data["days"]:
                for start_t, end_t in doc_data["windows"]:
                    rule = AvailabilityRule(
                        doctor_id=doc.id,
                        weekday=day,
                        start_time=start_t,
                        end_time=end_t,
                    )
                    db.add(rule)

    db.commit()

    # 2. Seed Patients
    created_patients: dict[str, User] = {}
    for pat_data in PATIENTS_SEED:
        pat = db.scalar(select(User).where(User.email == pat_data["email"]))
        if not pat:
            pat = User(
                email=pat_data["email"],
                password_hash=get_password_hash(DEMO_PASSWORD),
                full_name=pat_data["full_name"],
                role=UserRole.PATIENT.value,
                phone=pat_data["phone"],
            )
            db.add(pat)
            db.flush()
            print(f"  + Created Patient: {pat.full_name} ({pat.email})")
        created_patients[pat_data["email"]] = pat

    db.commit()

    # 3. Seed One Doctor Leave Day for Dr. Priya Nair
    priya = created_doctors["dr.nair@clinic.com"]
    leave_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=3)).date()
    existing_leave = db.scalar(
        select(DoctorLeave).where(
            DoctorLeave.doctor_id == priya.id,
            DoctorLeave.date == leave_date,
        )
    )
    if not existing_leave:
        leave = DoctorLeave(
            doctor_id=priya.id,
            date=leave_date,
            reason="Attending National Dermatology Annual Conference",
        )
        db.add(leave)
        print(f"  + Added Leave for Dr. Priya Nair on {leave_date}")

    db.commit()

    # 4. Seed sample appointments (Past and Upcoming)
    rohan = created_patients["rohan.patient@example.com"]
    ananya = created_patients["ananya.patient@example.com"]
    dr_sharma = created_doctors["dr.sharma@clinic.com"]
    dr_kothari = created_doctors["dr.kothari@clinic.com"]

    now_clinic = datetime.now(timezone.utc).astimezone(settings.tz)
    tomorrow = (now_clinic + timedelta(days=1)).date()
    yesterday = (now_clinic - timedelta(days=1)).date()

    # Upcoming appointment 1: Rohan with Dr. Sharma tomorrow at 10:00 AM IST
    up1_local = datetime.combine(tomorrow, time(10, 0), tzinfo=settings.tz)
    up1_utc = up1_local.astimezone(timezone.utc)
    up1_end_utc = up1_utc + timedelta(minutes=15)

    existing_up1 = db.scalar(
        select(Appointment).where(
            Appointment.doctor_id == dr_sharma.id,
            Appointment.start_at == up1_utc,
        )
    )
    if not existing_up1:
        appt1 = Appointment(
            patient_id=rohan.id,
            doctor_id=dr_sharma.id,
            start_at=up1_utc,
            end_at=up1_end_utc,
            status=AppointmentStatus.BOOKED.value,
            reason="Seasonal allergies and persistent cough checkup",
        )
        db.add(appt1)

    # Upcoming appointment 2: Ananya with Dr. Kothari tomorrow at 11:00 AM IST
    up2_local = datetime.combine(tomorrow, time(11, 0), tzinfo=settings.tz)
    up2_utc = up2_local.astimezone(timezone.utc)
    up2_end_utc = up2_utc + timedelta(minutes=30)

    existing_up2 = db.scalar(
        select(Appointment).where(
            Appointment.doctor_id == dr_kothari.id,
            Appointment.start_at == up2_utc,
        )
    )
    if not existing_up2:
        appt2 = Appointment(
            patient_id=ananya.id,
            doctor_id=dr_kothari.id,
            start_at=up2_utc,
            end_at=up2_end_utc,
            status=AppointmentStatus.BOOKED.value,
            reason="Routine cardiovascular health screening and ECG evaluation",
        )
        db.add(appt2)

    # Past completed appointment: Rohan with Dr. Sharma yesterday at 11:00 AM IST
    past_local = datetime.combine(yesterday, time(11, 0), tzinfo=settings.tz)
    past_utc = past_local.astimezone(timezone.utc)
    past_end_utc = past_utc + timedelta(minutes=15)

    existing_past = db.scalar(
        select(Appointment).where(
            Appointment.doctor_id == dr_sharma.id,
            Appointment.start_at == past_utc,
        )
    )
    if not existing_past:
        appt_past = Appointment(
            patient_id=rohan.id,
            doctor_id=dr_sharma.id,
            start_at=past_utc,
            end_at=past_end_utc,
            status=AppointmentStatus.COMPLETED.value,
            reason="Blood pressure review and annual physical examination",
        )
        db.add(appt_past)

    db.commit()
    print("[OK] Database seeding completed successfully!\n")

    # Print Demo Logins Table
    print("=" * 70)
    print("DEMO CREDENTIALS TABLE")
    print("=" * 70)
    print(f"{'Role':<10} | {'Full Name':<20} | {'Email':<28} | {'Password'}")
    print("-" * 70)
    for doc in DOCTORS_SEED:
        print(f"{'DOCTOR':<10} | {doc['full_name']:<20} | {doc['email']:<28} | {DEMO_PASSWORD}")
    for pat in PATIENTS_SEED:
        print(f"{'PATIENT':<10} | {pat['full_name']:<20} | {pat['email']:<28} | {DEMO_PASSWORD}")
    print("=" * 70)


def main():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
