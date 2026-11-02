"""Idempotent database seeder for doctors, patients, schedules, appointments, and leaves.

Run via:
    python -m app.seed
"""

import os
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import AvailabilityRule, DoctorLeave, DoctorProfile
from app.models.user import User, UserRole

DEMO_PASSWORD = "DemoPassword123!"

DOCTORS_SEED = [
    {
        "email": "dr.sharma@clinic.com",
        "full_name": "Dr. Arvind Sharma",
        "phone": "+91 98201 11223",
        "speciality": "General Physician",
        "bio": "Senior family physician with 18+ years of experience in preventive medicine, routine wellness, and chronic illness management.",
        "qualifications": "MBBS, MD (General Medicine), FACP",
        "years_of_experience": 18,
        "languages": ["English", "Hindi", "Punjabi"],
        "avatar_color": "#0E9AA7",
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
        "qualifications": "MBBS, MD (Dermatology, Venereology & Leprosy)",
        "years_of_experience": 12,
        "languages": ["English", "Hindi", "Malayalam", "Tamil"],
        "avatar_color": "#8B7FE8",
        "slot_minutes": 30,
        "consultation_fee": 650.00,
        # Exact requirement: Mon–Sat 10:00–13:00 + 17:00–20:00
        "days": [0, 1, 2, 3, 4, 5],  # Mon - Sat
        "windows": [(time(10, 0), time(13, 0)), (time(17, 0), time(20, 0))],
    },
    {
        "email": "dr.kothari@clinic.com",
        "full_name": "Dr. Rajesh Kothari",
        "phone": "+91 98203 33445",
        "speciality": "Cardiologist",
        "bio": "Interventional cardiologist and researcher with expertise in hypertension, lipidology, and cardiovascular rehabilitation.",
        "qualifications": "MBBS, MD, DM (Cardiology), FACC",
        "years_of_experience": 22,
        "languages": ["English", "Hindi", "Gujarati", "Marathi"],
        "avatar_color": "#FF8A5B",
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
        "qualifications": "MBBS, DCH, DNB (Pediatrics)",
        "years_of_experience": 9,
        "languages": ["English", "Hindi", "Gujarati"],
        "avatar_color": "#2FB67C",
        "slot_minutes": 15,
        "consultation_fee": 500.00,
        "days": [1, 2, 3, 4, 5, 6],  # Tue - Sun
        "windows": [(time(9, 30), time(13, 0)), (time(16, 0), time(19, 0))],
    },
    {
        "email": "dr.mukherjee@clinic.com",
        "full_name": "Dr. Rohan Mukherjee",
        "phone": "+91 98205 55667",
        "speciality": "Orthopedic Surgeon",
        "bio": "Specialist in trauma surgery, sports medicine, arthroscopy, and robotic joint reconstructions.",
        "qualifications": "MBBS, MS (Orthopedics), MCh (Joint Replacement)",
        "years_of_experience": 16,
        "languages": ["English", "Hindi", "Bengali"],
        "avatar_color": "#4A90E2",
        "slot_minutes": 30,
        "consultation_fee": 800.00,
        "days": [0, 1, 2, 3, 4],  # Mon - Fri
        "windows": [(time(10, 0), time(13, 30)), (time(16, 0), time(19, 0))],
    },
    {
        "email": "dr.reddy@clinic.com",
        "full_name": "Dr. Sunita Reddy",
        "phone": "+91 98206 66778",
        "speciality": "Gynecologist",
        "bio": "Experienced obstetrician and laparoscopic surgeon specializing in high-risk pregnancies and reproductive endocrinology.",
        "qualifications": "MBBS, MS (Obstetrics & Gynecology), FICOG",
        "years_of_experience": 15,
        "languages": ["English", "Hindi", "Telugu", "Kannada"],
        "avatar_color": "#D0021B",
        "slot_minutes": 30,
        "consultation_fee": 700.00,
        "days": [0, 1, 2, 3, 4, 5],  # Mon - Sat
        "windows": [(time(9, 0), time(13, 0)), (time(17, 0), time(19, 30))],
    },
    {
        "email": "dr.singhania@clinic.com",
        "full_name": "Dr. Vikram Singhania",
        "phone": "+91 98207 77889",
        "speciality": "Neurologist",
        "bio": "Senior neuro-physician with special clinical focus on stroke therapy, epilepsy management, migraine disorders, and neuropathy.",
        "qualifications": "MBBS, MD (Medicine), DM (Neurology)",
        "years_of_experience": 14,
        "languages": ["English", "Hindi", "Urdu"],
        "avatar_color": "#7ED321",
        "slot_minutes": 30,
        "consultation_fee": 950.00,
        "days": [0, 1, 2, 3, 4],  # Mon - Fri
        "windows": [(time(11, 0), time(14, 0)), (time(17, 30), time(20, 30))],
    },
    {
        "email": "dr.sengupta@clinic.com",
        "full_name": "Dr. Ananya Sengupta",
        "phone": "+91 98208 88990",
        "speciality": "Psychiatrist",
        "bio": "Consultant neuropsychiatrist addressing clinical depression, adult ADHD, anxiety management, and psychotherapy.",
        "qualifications": "MBBS, MD (Psychiatry), MRCPsych",
        "years_of_experience": 11,
        "languages": ["English", "Hindi", "Bengali"],
        "avatar_color": "#BD10E0",
        "slot_minutes": 30,
        "consultation_fee": 750.00,
        "days": [1, 2, 3, 4, 5],  # Tue - Sat
        "windows": [(time(10, 0), time(13, 0)), (time(15, 30), time(19, 0))],
    },
    {
        "email": "dr.qureshi@clinic.com",
        "full_name": "Dr. Farhan Qureshi",
        "phone": "+91 98209 99001",
        "speciality": "ENT Specialist",
        "bio": "ENT surgeon specializing in endoscopic sinus surgery, micro-ear reconstruction, pediatric airway care, and balance disorders.",
        "qualifications": "MBBS, MS (ENT - Otorhinolaryngology)",
        "years_of_experience": 13,
        "languages": ["English", "Hindi", "Urdu", "Marathi"],
        "avatar_color": "#50E3C2",
        "slot_minutes": 15,
        "consultation_fee": 550.00,
        "days": [0, 1, 2, 3, 4, 5],  # Mon - Sat
        "windows": [(time(9, 30), time(13, 0)), (time(16, 30), time(19, 30))],
    },
    {
        "email": "dr.joshi@clinic.com",
        "full_name": "Dr. Kavita Joshi",
        "phone": "+91 98210 00112",
        "speciality": "Ophthalmologist",
        "bio": "Cataract and refractive surgeon with extensive surgical mastery in Phacoemulsification, glaucoma lasers, and computer vision syndrome.",
        "qualifications": "MBBS, MS (Ophthalmology), FICO (UK)",
        "years_of_experience": 17,
        "languages": ["English", "Hindi", "Marathi"],
        "avatar_color": "#F5A623",
        "slot_minutes": 15,
        "consultation_fee": 600.00,
        "days": [0, 1, 2, 3, 4, 5],  # Mon - Sat
        "windows": [(time(10, 0), time(13, 30)), (time(17, 0), time(20, 0))],
    },
    {
        "email": "dr.banerjee@clinic.com",
        "full_name": "Dr. Amitav Banerjee",
        "phone": "+91 98211 11223",
        "speciality": "Gastroenterologist",
        "bio": "Therapeutic endoscopist specializing in inflammatory bowel disease (IBD), liver cirrhosis, acid peptic disorders, and pancreatic disease.",
        "qualifications": "MBBS, MD, DM (Medical Gastroenterology)",
        "years_of_experience": 19,
        "languages": ["English", "Hindi", "Bengali"],
        "avatar_color": "#9013FE",
        "slot_minutes": 30,
        "consultation_fee": 850.00,
        "days": [0, 1, 2, 3, 4],  # Mon - Fri
        "windows": [(time(10, 0), time(14, 0)), (time(18, 0), time(21, 0))],
    },
    {
        "email": "dr.kapoor@clinic.com",
        "full_name": "Dr. Neha Kapoor",
        "phone": "+91 98212 22334",
        "speciality": "Pulmonologist",
        "bio": "Chest physician treating chronic asthma, COPD, sleep apnea, post-COVID pulmonary fibrosis, and respiratory allergies.",
        "qualifications": "MBBS, MD (Pulmonary Medicine), FCCP",
        "years_of_experience": 10,
        "languages": ["English", "Hindi", "Punjabi"],
        "avatar_color": "#B8E986",
        "slot_minutes": 30,
        "consultation_fee": 650.00,
        "days": [0, 1, 2, 3, 4, 5],  # Mon - Sat
        "windows": [(time(9, 0), time(12, 30)), (time(16, 0), time(19, 0))],
    },
]

PATIENTS_SEED = [
    {
        "email": "rohan.patient@example.com",
        "full_name": "Rohan Verma",
        "phone": "+91 97111 00111",
        "date_of_birth": date(1992, 5, 14),
        "gender": "male",
        "emergency_contact_name": "Kavita Verma (Spouse)",
        "emergency_contact_phone": "+91 97111 00999",
        "patient_notes": "Mild seasonal allergic rhinitis. Penicillin sensitive. Prefers morning appointments.",
        "avatar_color": "#0E9AA7",
    },
    {
        "email": "ananya.patient@example.com",
        "full_name": "Ananya Iyer",
        "phone": "+91 97112 00222",
        "date_of_birth": date(1996, 9, 21),
        "gender": "female",
        "emergency_contact_name": "Subramanian Iyer (Father)",
        "emergency_contact_phone": "+91 97112 00888",
        "patient_notes": "Routine wellness checks. Regular follow-up for contact lens intolerance.",
        "avatar_color": "#8B7FE8",
    },
    {
        "email": "vikram.patient@example.com",
        "full_name": "Vikram Patel",
        "phone": "+91 97113 00333",
        "date_of_birth": date(1985, 3, 30),
        "gender": "male",
        "emergency_contact_name": "Pooja Patel (Spouse)",
        "emergency_contact_phone": "+91 97113 00777",
        "patient_notes": "Hypertension under control with low-dose ACE inhibitor. Requires periodic lipid panels.",
        "avatar_color": "#FF8A5B",
    },
]


def seed_database(db: Session, force_production: bool = False) -> None:
    """Seed seed data idempotently. Refuses in production without explicit flag."""
    is_production = os.environ.get("ENVIRONMENT", "").lower() == "production" or os.environ.get("RENDER", "") == "true"
    allow_flag = os.environ.get("ALLOW_PRODUCTION_SEED", "").lower() in ("true", "1", "yes")

    if is_production and not (allow_flag or force_production):
        raise RuntimeError(
            "Refusing to execute seed script in a PRODUCTION environment without explicit "
            "ALLOW_PRODUCTION_SEED=true environment variable."
        )

    print("\n[*] Starting idempotent clinic database seeding...")

    # 1. Seed Doctors & Profiles
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
                avatar_color=doc_data["avatar_color"],
            )
            db.add(doc)
            db.flush()
            print(f"  + Created Doctor: {doc.full_name} ({doc.email})")
        else:
            doc.full_name = doc_data["full_name"]
            doc.phone = doc_data["phone"]
            doc.avatar_color = doc_data["avatar_color"]

        created_doctors[doc_data["email"]] = doc

        # Profile
        profile = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == doc.id))
        if not profile:
            profile = DoctorProfile(
                user_id=doc.id,
                speciality=doc_data["speciality"],
                bio=doc_data["bio"],
                qualifications=doc_data.get("qualifications"),
                years_of_experience=doc_data.get("years_of_experience"),
                languages=doc_data.get("languages", []),
                slot_minutes=doc_data["slot_minutes"],
                consultation_fee=doc_data["consultation_fee"],
                is_active=True,
            )
            db.add(profile)
        else:
            profile.speciality = doc_data["speciality"]
            profile.qualifications = doc_data.get("qualifications")
            profile.years_of_experience = doc_data.get("years_of_experience")
            profile.languages = doc_data.get("languages", [])
            profile.bio = doc_data["bio"]
            profile.consultation_fee = doc_data["consultation_fee"]
            profile.slot_minutes = doc_data["slot_minutes"]
            profile.is_active = True
            db.flush()

        # Availability rules
        existing_rules = db.scalars(select(AvailabilityRule).where(AvailabilityRule.doctor_id == doc.id)).all()
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
                date_of_birth=pat_data.get("date_of_birth"),
                gender=pat_data.get("gender"),
                emergency_contact_name=pat_data.get("emergency_contact_name"),
                emergency_contact_phone=pat_data.get("emergency_contact_phone"),
                patient_notes=pat_data.get("patient_notes"),
                avatar_color=pat_data.get("avatar_color", "#0E9AA7"),
            )
            db.add(pat)
            db.flush()
            print(f"  + Created Patient: {pat.full_name} ({pat.email})")
        else:
            pat.date_of_birth = pat_data.get("date_of_birth")
            pat.gender = pat_data.get("gender")
            pat.emergency_contact_name = pat_data.get("emergency_contact_name")
            pat.emergency_contact_phone = pat_data.get("emergency_contact_phone")
            pat.patient_notes = pat_data.get("patient_notes")
            pat.avatar_color = pat_data.get("avatar_color", "#0E9AA7")

        created_patients[pat_data["email"]] = pat

    db.commit()

    # 3. Seed One Doctor Leave Day for Dr. Priya Nair
    priya = created_doctors["dr.nair@clinic.com"]
    leave_date = (datetime.now(timezone.utc).astimezone(settings.tz) + timedelta(days=5)).date()
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

    # 4. Seed sample appointments (Past completed/no-show/cancelled, one today, several upcoming)
    rohan = created_patients["rohan.patient@example.com"]
    ananya = created_patients["ananya.patient@example.com"]
    vikram = created_patients["vikram.patient@example.com"]
    dr_sharma = created_doctors["dr.sharma@clinic.com"]
    dr_nair = created_doctors["dr.nair@clinic.com"]
    dr_kothari = created_doctors["dr.kothari@clinic.com"]

    now_clinic = datetime.now(timezone.utc).astimezone(settings.tz)
    today = now_clinic.date()
    yesterday = (now_clinic - timedelta(days=1)).date()
    day_before = (now_clinic - timedelta(days=2)).date()
    three_days_ago = (now_clinic - timedelta(days=3)).date()
    tomorrow = (now_clinic + timedelta(days=1)).date()
    in_2_days = (now_clinic + timedelta(days=2)).date()
    in_3_days = (now_clinic + timedelta(days=3)).date()

    # Appointment 1: Past COMPLETED yesterday (Rohan with Dr. Sharma)
    past_comp_local = datetime.combine(yesterday, time(10, 0), tzinfo=settings.tz)
    past_comp_utc = past_comp_local.astimezone(timezone.utc)
    if not db.scalar(
        select(Appointment).where(Appointment.doctor_id == dr_sharma.id, Appointment.start_at == past_comp_utc)
    ):
        db.add(
            Appointment(
                patient_id=rohan.id,
                doctor_id=dr_sharma.id,
                start_at=past_comp_utc,
                end_at=past_comp_utc + timedelta(minutes=15),
                status=AppointmentStatus.COMPLETED.value,
                reason="Blood pressure review and annual physical examination",
            )
        )

    # Appointment 2: Past NO-SHOW two days ago (Ananya with Dr. Nair)
    past_ns_local = datetime.combine(day_before, time(11, 0), tzinfo=settings.tz)
    past_ns_utc = past_ns_local.astimezone(timezone.utc)
    if not db.scalar(
        select(Appointment).where(Appointment.doctor_id == dr_nair.id, Appointment.start_at == past_ns_utc)
    ):
        db.add(
            Appointment(
                patient_id=ananya.id,
                doctor_id=dr_nair.id,
                start_at=past_ns_utc,
                end_at=past_ns_utc + timedelta(minutes=30),
                status=AppointmentStatus.NO_SHOW.value,
                reason="Skin rash consultation - patient did not arrive",
            )
        )

    # Appointment 3: Past CANCELLED three days ago (Vikram with Dr. Kothari)
    past_canc_local = datetime.combine(three_days_ago, time(11, 30), tzinfo=settings.tz)
    past_canc_utc = past_canc_local.astimezone(timezone.utc)
    if not db.scalar(
        select(Appointment).where(Appointment.doctor_id == dr_kothari.id, Appointment.start_at == past_canc_utc)
    ):
        db.add(
            Appointment(
                patient_id=vikram.id,
                doctor_id=dr_kothari.id,
                start_at=past_canc_utc,
                end_at=past_canc_utc + timedelta(minutes=30),
                status=AppointmentStatus.CANCELLED.value,
                reason="Rescheduled by patient due to urgent travel",
                cancelled_at=past_canc_utc - timedelta(days=1),
                cancelled_by=vikram.id,
            )
        )

    # Appointment 4: ONE TODAY (Vikram with Dr. Sharma at 17:00 IST today)
    today_local = datetime.combine(today, time(17, 0), tzinfo=settings.tz)
    today_utc = today_local.astimezone(timezone.utc)
    if not db.scalar(
        select(Appointment).where(Appointment.doctor_id == dr_sharma.id, Appointment.start_at == today_utc)
    ):
        db.add(
            Appointment(
                patient_id=vikram.id,
                doctor_id=dr_sharma.id,
                start_at=today_utc,
                end_at=today_utc + timedelta(minutes=15),
                status=AppointmentStatus.BOOKED.value,
                reason="Follow-up on seasonal fever and prescription renewal",
            )
        )

    # Appointment 5: Upcoming tomorrow (Rohan with Dr. Sharma at 10:00 IST)
    up1_local = datetime.combine(tomorrow, time(10, 0), tzinfo=settings.tz)
    up1_utc = up1_local.astimezone(timezone.utc)
    if not db.scalar(select(Appointment).where(Appointment.doctor_id == dr_sharma.id, Appointment.start_at == up1_utc)):
        db.add(
            Appointment(
                patient_id=rohan.id,
                doctor_id=dr_sharma.id,
                start_at=up1_utc,
                end_at=up1_utc + timedelta(minutes=15),
                status=AppointmentStatus.BOOKED.value,
                reason="Persistent dry cough checkup",
            )
        )

    # Appointment 6: Upcoming in 2 days (Ananya with Dr. Kothari at 11:00 IST)
    up2_local = datetime.combine(in_2_days, time(11, 0), tzinfo=settings.tz)
    up2_utc = up2_local.astimezone(timezone.utc)
    if not db.scalar(
        select(Appointment).where(Appointment.doctor_id == dr_kothari.id, Appointment.start_at == up2_utc)
    ):
        db.add(
            Appointment(
                patient_id=ananya.id,
                doctor_id=dr_kothari.id,
                start_at=up2_utc,
                end_at=up2_utc + timedelta(minutes=30),
                status=AppointmentStatus.BOOKED.value,
                reason="Routine cardiovascular health screening and ECG evaluation",
            )
        )

    # Appointment 7: Upcoming in 3 days (Vikram with Dr. Nair at 10:30 IST)
    up3_local = datetime.combine(in_3_days, time(10, 30), tzinfo=settings.tz)
    up3_utc = up3_local.astimezone(timezone.utc)
    if not db.scalar(select(Appointment).where(Appointment.doctor_id == dr_nair.id, Appointment.start_at == up3_utc)):
        db.add(
            Appointment(
                patient_id=vikram.id,
                doctor_id=dr_nair.id,
                start_at=up3_utc,
                end_at=up3_utc + timedelta(minutes=30),
                status=AppointmentStatus.BOOKED.value,
                reason="Allergy patch testing and dermatology consultation",
            )
        )

    db.commit()
    print("[OK] Database seeding completed successfully!\n")

    # Print Demo Logins Table
    print("=" * 80)
    print("DEMO CREDENTIALS TABLE")
    print("=" * 80)
    print(f"{'Role':<10} | {'Full Name':<22} | {'Email':<30} | {'Password'}")
    print("-" * 80)
    for doc in DOCTORS_SEED:
        print(f"{'DOCTOR':<10} | {doc['full_name']:<22} | {doc['email']:<30} | {DEMO_PASSWORD}")
    for pat in PATIENTS_SEED:
        print(f"{'PATIENT':<10} | {pat['full_name']:<22} | {pat['email']:<30} | {DEMO_PASSWORD}")
    print("=" * 80)


def main():
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
