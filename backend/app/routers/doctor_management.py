"""Doctor-only endpoints for managing availability schedule and leaves."""

from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_doctor
from app.models.doctor import DoctorLeave
from app.models.user import User
from app.schemas.doctor import (
    DoctorDetailResponse,
    DoctorLeaveCreateRequest,
    DoctorLeaveResponse,
    UpdateDoctorAvailabilityRequest,
)
from app.services import doctor_service

router = APIRouter(prefix="/doctor", tags=["Doctor Management"])


@router.get(
    "/availability",
    response_model=DoctorDetailResponse,
    summary="Get authenticated doctor's current availability schedule",
)
def get_my_availability(
    current_doctor: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Retrieve the logged-in doctor's profile and weekly schedule rules."""
    return doctor_service.get_doctor_details(db, current_doctor.id)


@router.put(
    "/availability",
    status_code=status.HTTP_200_OK,
    summary="Update authenticated doctor's slot minutes and weekly availability rules",
)
def update_my_availability(
    payload: UpdateDoctorAvailabilityRequest,
    current_doctor: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Update recurring weekly availability windows and slot length (15 or 30 mins)."""
    doctor_service.update_doctor_schedule_and_profile(db, current_doctor.id, payload)
    return {"message": "Availability schedule updated successfully."}


@router.get(
    "/leaves",
    response_model=list[DoctorLeaveResponse],
    summary="List authenticated doctor's leave dates",
)
def get_my_leaves(
    current_doctor: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Retrieve all leave records for the logged-in doctor."""
    leaves = db.scalars(
        select(DoctorLeave)
        .where(DoctorLeave.doctor_id == current_doctor.id)
        .order_by(DoctorLeave.date)
    ).all()
    return list(leaves)


@router.post(
    "/leaves",
    response_model=DoctorLeaveResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Block off a single date as doctor leave",
)
def block_leave_date(
    payload: DoctorLeaveCreateRequest,
    current_doctor: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Block off a single day. Rejected if active appointments already exist on that day."""
    new_leave = doctor_service.block_doctor_leave_date(
        db=db,
        doctor_id=current_doctor.id,
        leave_date=payload.date,
        reason=payload.reason,
    )
    return DoctorLeaveResponse.model_validate(new_leave)


@router.delete(
    "/leaves",
    status_code=status.HTTP_200_OK,
    summary="Unblock a doctor leave date",
)
def delete_leave_date(
    date: date = Query(..., description="Date to unblock in YYYY-MM-DD format"),
    current_doctor: User = Depends(require_doctor),
    db: Session = Depends(get_db),
):
    """Remove a previously blocked leave date, restoring normal weekly availability."""
    doctor_service.unblock_doctor_leave_date(db, current_doctor.id, date)
    return {"message": f"Leave date {date} removed successfully."}
