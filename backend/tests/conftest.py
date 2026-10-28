"""Pytest configuration and shared test fixtures against real PostgreSQL."""

import sys
from collections.abc import Generator
from datetime import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.doctor import AvailabilityRule, DoctorProfile
from app.models.user import User, UserRole

# Safety verification: ensure TEST_DATABASE_URL is set and never equals DATABASE_URL
if not settings.TEST_DATABASE_URL:
    raise RuntimeError(
        "TEST_DATABASE_URL environment variable is required to run tests against real PostgreSQL. "
        "Refusing to run tests without an isolated test database."
    )

if settings.sync_test_database_url == settings.sync_database_url or (
    settings.DEV_DATABASE_URL and settings.sync_test_database_url == settings.DEV_DATABASE_URL
):
    raise RuntimeError(
        "Refusing to run tests: TEST_DATABASE_URL equals DATABASE_URL or DEV_DATABASE_URL. "
        "Tests must run ONLY against a dedicated test database to protect live data."
    )

# Use the real PostgreSQL test database URL
test_engine = create_engine(
    settings.sync_test_database_url,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=20,
)
TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database schema is up-to-date and clean."""
    with test_engine.connect() as conn:
        conn.execute(text("SELECT 1;"))
    yield


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Provide a fresh DB session for each test and cleanup created data."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Test client overriding the get_db dependency with thread-safe session maker."""

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seed_test_data(db: Session):
    """Seed sample doctors with rules and sample patients."""
    # Clean previous test entries to avoid collisions
    db.execute(text("DELETE FROM reminders;"))
    db.execute(text("DELETE FROM appointments;"))
    db.execute(text("DELETE FROM doctor_leaves;"))
    db.execute(text("DELETE FROM availability_rules;"))
    db.execute(text("DELETE FROM doctor_profiles;"))
    db.execute(text("DELETE FROM users WHERE email LIKE 'test_%@clinic.com';"))
    db.commit()
    db.expire_all()

    # 1. Create Doctor 1
    doc1 = User(
        email="test_doctor1@clinic.com",
        password_hash=get_password_hash("DoctorPass123!"),
        full_name="Dr. Sarah Test",
        role=UserRole.DOCTOR.value,
        phone="+919876543210",
    )
    # 2. Create Doctor 2 (for multi-doctor overlap testing)
    doc2 = User(
        email="test_doctor2@clinic.com",
        password_hash=get_password_hash("DoctorPass123!"),
        full_name="Dr. James Test",
        role=UserRole.DOCTOR.value,
        phone="+919876543211",
    )
    db.add_all([doc1, doc2])
    db.commit()
    db.refresh(doc1)
    db.refresh(doc2)

    doc_profile1 = DoctorProfile(
        user_id=doc1.id,
        speciality="Cardiology",
        bio="Senior cardiologist for testing",
        slot_minutes=30,
        consultation_fee=500.00,
        is_active=True,
    )
    doc_profile2 = DoctorProfile(
        user_id=doc2.id,
        speciality="Dermatology",
        bio="Senior dermatologist for testing",
        slot_minutes=30,
        consultation_fee=400.00,
        is_active=True,
    )
    db.add_all([doc_profile1, doc_profile2])

    # Add Mon-Sun rules for both doctors: 10:00 to 13:00 and 17:00 to 20:00
    for day in range(7):
        r1 = AvailabilityRule(doctor_id=doc1.id, weekday=day, start_time=time(10, 0), end_time=time(13, 0))
        r2 = AvailabilityRule(doctor_id=doc1.id, weekday=day, start_time=time(17, 0), end_time=time(20, 0))
        r3 = AvailabilityRule(doctor_id=doc2.id, weekday=day, start_time=time(10, 0), end_time=time(13, 0))
        r4 = AvailabilityRule(doctor_id=doc2.id, weekday=day, start_time=time(17, 0), end_time=time(20, 0))
        db.add_all([r1, r2, r3, r4])

    # 3. Create 2 Patients
    pat1 = User(
        email="test_pat1@clinic.com",
        password_hash=get_password_hash("PatientPass123!"),
        full_name="Alice Test Patient",
        role=UserRole.PATIENT.value,
        phone="+919123456781",
    )
    pat2 = User(
        email="test_pat2@clinic.com",
        password_hash=get_password_hash("PatientPass123!"),
        full_name="Bob Test Patient",
        role=UserRole.PATIENT.value,
        phone="+919123456782",
    )
    db.add_all([pat1, pat2])
    db.commit()

    doc1_token = create_access_token({"sub": str(doc1.id), "role": doc1.role, "email": doc1.email})
    doc2_token = create_access_token({"sub": str(doc2.id), "role": doc2.role, "email": doc2.email})
    pat1_token = create_access_token({"sub": str(pat1.id), "role": pat1.role, "email": pat1.email})
    pat2_token = create_access_token({"sub": str(pat2.id), "role": pat2.role, "email": pat2.email})

    return {
        "doctor": doc1,
        "doctor_token": doc1_token,
        "doctor2": doc2,
        "doctor2_token": doc2_token,
        "patient1": pat1,
        "patient1_token": pat1_token,
        "patient2": pat2,
        "patient2_token": pat2_token,
    }
