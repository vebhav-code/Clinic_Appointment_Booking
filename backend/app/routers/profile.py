"""Profile and account security endpoints for authenticated users."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.profile import (
    ChangePasswordRequest,
    PatientNotesResponse,
    ProfileResponse,
    UpdateProfileRequest,
)
from app.services import profile_service

router = APIRouter(prefix="/profile", tags=["Profile & Account"])


@router.get(
    "",
    response_model=ProfileResponse,
    summary="Get authenticated user's profile and clinical metrics",
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve personal and professional profile details for the current user."""
    return profile_service.get_user_profile(db, current_user)


@router.put(
    "",
    response_model=ProfileResponse,
    summary="Update authenticated user's profile",
)
def update_my_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile with strict server-side validation and role awareness."""
    return profile_service.update_user_profile(db, current_user, payload)


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change account password",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Verify current password and update to new password (min 8 chars)."""
    profile_service.change_user_password(db, current_user, payload)
    return {"message": "Password updated successfully."}


@router.get(
    "/patient/{patient_id}/notes",
    response_model=PatientNotesResponse,
    summary="Get patient clinical notes with privacy protection",
)
def get_patient_notes(
    patient_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve patient notes; accessible only by the patient or their booked doctor."""
    return profile_service.get_patient_notes_for_user(db, current_user, patient_id)
