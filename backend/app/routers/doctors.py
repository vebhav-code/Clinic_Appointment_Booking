"""Public doctor directory and slot exploration endpoints (accessible to authenticated users)."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.doctor import DoctorDetailResponse, DoctorListItem, SlotsResponse
from app.services import doctor_service

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get(
    "",
    response_model=list[DoctorListItem],
    summary="List doctors with optional search and speciality filters",
)
def list_doctors(
    speciality: str | None = Query(None, description="Filter by doctor speciality"),
    search: str | None = Query(None, description="Search by doctor name or speciality"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve list of active clinic doctors."""
    return doctor_service.get_all_doctors(db, speciality=speciality, search=search)


@router.get(
    "/{doctor_id}",
    response_model=DoctorDetailResponse,
    summary="Get doctor profile and weekly schedule rules",
)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a single doctor."""
    return doctor_service.get_doctor_details(db, doctor_id)


@router.get(
    "/{doctor_id}/slots",
    response_model=SlotsResponse,
    summary="Get free slots for a doctor on a specific date",
)
def get_doctor_slots(
    doctor_id: int,
    date: date = Query(..., description="Target date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compute available booking slots for a doctor on the specified date."""
    return doctor_service.get_doctor_slots_for_date(db, doctor_id, date)
