"""Patient appointment endpoints: booking, cancellation, rescheduling, and history."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_patient
from app.models.user import User
from app.schemas.appointment import (
    AppointmentResponse,
    BookAppointmentRequest,
    RescheduleAppointmentRequest,
)
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["Appointments (Patient)"])


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book an appointment slot",
)
def book(
    payload: BookAppointmentRequest,
    current_patient: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Book an appointment for the authenticated patient with concurrency protection."""
    return appointment_service.book_appointment(
        db=db,
        patient_id=current_patient.id,
        doctor_id=payload.doctor_id,
        start_at=payload.start_at,
        reason=payload.reason,
    )


@router.get(
    "/upcoming",
    response_model=list[AppointmentResponse],
    summary="Get upcoming active appointments for current patient",
)
def get_upcoming(
    current_patient: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Retrieve chronologically ordered upcoming booked appointments."""
    return appointment_service.get_patient_upcoming_appointments(db, current_patient.id)


@router.get(
    "/past",
    response_model=list[AppointmentResponse],
    summary="Get past/concluded appointments for current patient",
)
def get_past(
    current_patient: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Retrieve reverse-chronologically ordered past, completed, no-show, or cancelled appointments."""
    return appointment_service.get_patient_past_appointments(db, current_patient.id)


@router.post(
    "/{appointment_id}/cancel",
    response_model=AppointmentResponse,
    summary="Cancel an appointment",
)
def cancel(
    appointment_id: int,
    current_patient: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Cancel a booked appointment (subject to the 2-hour cutoff rule)."""
    return appointment_service.cancel_appointment(db, appointment_id, current_patient.id)


@router.post(
    "/{appointment_id}/reschedule",
    response_model=AppointmentResponse,
    summary="Atomically reschedule an appointment to a new slot",
)
def reschedule(
    appointment_id: int,
    payload: RescheduleAppointmentRequest,
    current_patient: User = Depends(require_patient),
    db: Session = Depends(get_db),
):
    """Atomically cancel existing appointment and book new slot in a single database transaction."""
    return appointment_service.reschedule_appointment(
        db=db,
        appointment_id=appointment_id,
        patient_id=current_patient.id,
        new_start_at=payload.new_start_at,
        reason=payload.reason,
    )
