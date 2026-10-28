"""User profile management, password updates, and doctor-patient clinical notes privacy."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import get_password_hash as hash_password
from app.core.security import verify_password
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole
from app.schemas.profile import (
    ChangePasswordRequest,
    DoctorProfessionalDetails,
    PatientNotesResponse,
    ProfileResponse,
    UpdateProfileRequest,
)


def get_user_profile(db: Session, user: User) -> ProfileResponse:
    """Retrieve full profile of the authenticated user including appointment metrics."""
    now_utc = datetime.now(timezone.utc)

    # Calculate stats depending on role
    if user.role == UserRole.PATIENT.value:
        total = db.scalar(select(func.count(Appointment.id)).where(Appointment.patient_id == user.id)) or 0
        upcoming = (
            db.scalar(
                select(func.count(Appointment.id)).where(
                    Appointment.patient_id == user.id,
                    Appointment.status == AppointmentStatus.BOOKED.value,
                    Appointment.end_at >= now_utc,
                )
            )
            or 0
        )
        completed = (
            db.scalar(
                select(func.count(Appointment.id)).where(
                    Appointment.patient_id == user.id,
                    Appointment.status == AppointmentStatus.COMPLETED.value,
                )
            )
            or 0
        )
    else:
        total = db.scalar(select(func.count(Appointment.id)).where(Appointment.doctor_id == user.id)) or 0
        upcoming = (
            db.scalar(
                select(func.count(Appointment.id)).where(
                    Appointment.doctor_id == user.id,
                    Appointment.status == AppointmentStatus.BOOKED.value,
                    Appointment.end_at >= now_utc,
                )
            )
            or 0
        )
        completed = (
            db.scalar(
                select(func.count(Appointment.id)).where(
                    Appointment.doctor_id == user.id,
                    Appointment.status == AppointmentStatus.COMPLETED.value,
                )
            )
            or 0
        )

    doctor_prof_schema = None
    if user.role == UserRole.DOCTOR.value and user.doctor_profile:
        doc = user.doctor_profile
        doctor_prof_schema = DoctorProfessionalDetails(
            speciality=doc.speciality,
            bio=doc.bio,
            qualifications=doc.qualifications,
            years_of_experience=doc.years_of_experience,
            languages=doc.languages or [],
            slot_minutes=doc.slot_minutes,
            consultation_fee=doc.consultation_fee,
            is_active=doc.is_active,
        )

    return ProfileResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        phone=user.phone,
        date_of_birth=user.date_of_birth,
        gender=user.gender,
        emergency_contact_name=user.emergency_contact_name,
        emergency_contact_phone=user.emergency_contact_phone,
        patient_notes=user.patient_notes,
        avatar_color=user.avatar_color or "#0E9AA7",
        created_at=user.created_at,
        total_appointments=total,
        upcoming_appointments=upcoming,
        completed_appointments=completed,
        doctor_profile=doctor_prof_schema,
    )


def update_user_profile(db: Session, user: User, payload: UpdateProfileRequest) -> ProfileResponse:
    """Update profile fields with role-awareness and strict validation."""
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip() if payload.phone.strip() else None
    if payload.date_of_birth is not None:
        user.date_of_birth = payload.date_of_birth
    if payload.gender is not None:
        user.gender = payload.gender
    if payload.emergency_contact_name is not None:
        user.emergency_contact_name = (
            payload.emergency_contact_name.strip() if payload.emergency_contact_name.strip() else None
        )
    if payload.emergency_contact_phone is not None:
        user.emergency_contact_phone = (
            payload.emergency_contact_phone.strip() if payload.emergency_contact_phone.strip() else None
        )
    if payload.patient_notes is not None:
        user.patient_notes = payload.patient_notes.strip() if payload.patient_notes.strip() else None
    if payload.avatar_color is not None:
        user.avatar_color = payload.avatar_color.strip()

    # Update doctor professional details if user is a doctor
    if user.role == UserRole.DOCTOR.value and user.doctor_profile:
        doc = user.doctor_profile
        if payload.speciality is not None:
            doc.speciality = payload.speciality.strip()
        if payload.bio is not None:
            doc.bio = payload.bio.strip() if payload.bio.strip() else None
        if payload.qualifications is not None:
            doc.qualifications = payload.qualifications.strip() if payload.qualifications.strip() else None
        if payload.years_of_experience is not None:
            doc.years_of_experience = payload.years_of_experience
        if payload.languages is not None:
            doc.languages = payload.languages
        if payload.consultation_fee is not None:
            doc.consultation_fee = payload.consultation_fee

    db.commit()
    db.refresh(user)
    return get_user_profile(db, user)


def change_user_password(db: Session, user: User, payload: ChangePasswordRequest) -> None:
    """Securely update account password after verifying current credentials."""
    if not verify_password(payload.current_password, user.password_hash):
        raise AppError(
            status_code=400,
            code="INVALID_CURRENT_PASSWORD",
            message="The current password you provided is incorrect.",
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()


def get_patient_notes_for_user(db: Session, requesting_user: User, patient_id: int) -> PatientNotesResponse:
    """Check clinical privacy: only the patient themselves or their booked doctor can view notes."""
    patient = db.scalar(select(User).where(User.id == patient_id))
    if not patient or patient.role != UserRole.PATIENT.value:
        raise AppError(
            status_code=404,
            code="PATIENT_NOT_FOUND",
            message=f"Patient with ID {patient_id} was not found.",
        )

    # 1. Patient viewing own notes
    if requesting_user.id == patient_id:
        return PatientNotesResponse(
            patient_id=patient.id,
            patient_name=patient.full_name,
            patient_notes=patient.patient_notes,
        )

    # 2. Doctor viewing patient notes: must have at least one appointment with this patient
    if requesting_user.role == UserRole.DOCTOR.value:
        has_appointment = db.scalar(
            select(Appointment.id)
            .where(
                Appointment.doctor_id == requesting_user.id,
                Appointment.patient_id == patient_id,
            )
            .limit(1)
        )
        if not has_appointment:
            raise AppError(
                status_code=403,
                code="FORBIDDEN_PATIENT_NOTES",
                message="Doctors can only view clinical notes for patients who have an appointment with them.",
            )

        return PatientNotesResponse(
            patient_id=patient.id,
            patient_name=patient.full_name,
            patient_notes=patient.patient_notes,
        )

    # 3. Any other user (e.g. other patients)
    raise AppError(
        status_code=403,
        code="FORBIDDEN_PROFILE_ACCESS",
        message="You cannot view clinical notes of other patients.",
    )
