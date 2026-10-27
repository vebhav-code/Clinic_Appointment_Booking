"""In-app reminders endpoints for notifications polling."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.reminder import ReminderListResponse
from app.services import reminder_service

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get(
    "",
    response_model=ReminderListResponse,
    summary="Get active unread reminders due within the 1-hour window",
)
def get_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve on-demand due reminders for the authenticated user."""
    return reminder_service.get_and_sync_due_reminders(db, current_user)


@router.post(
    "/{reminder_id}/read",
    status_code=status.HTTP_200_OK,
    summary="Mark a reminder notification as read",
)
def mark_read(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark the given notification as read so it no longer appears in the badge/list."""
    reminder_service.mark_reminder_read(db, reminder_id, current_user.id)
    return {"message": "Reminder marked as read."}
