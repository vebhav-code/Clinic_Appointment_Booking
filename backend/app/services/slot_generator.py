"""Pure slot generation service.

Rules:
1. Clinic timezone is used for date/weekday calculations; all storage/slots in UTC.
2. Windows are sliced into slots of slot_minutes (15 or 30).
3. Partial slots at the end of a window are dropped.
4. Dates on leave return no slots.
5. Past slots (start_at <= now + buffer) are dropped.
6. Slots overlapping active appointments (status != cancelled) are dropped.
7. Booking window limit is enforced.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.core.errors import AppError


@dataclass(frozen=True)
class TimeWindow:
    """Window of availability for a weekday."""
    start_time: time
    end_time: time


@dataclass(frozen=True)
class BookedInterval:
    """Existing appointment interval in UTC."""
    start_at: datetime
    end_at: datetime
    status: str


@dataclass
class GeneratedSlot:
    """Generated free slot in UTC and clinic local time."""
    start_at: datetime
    end_at: datetime
    local_start: str
    local_end: str


def validate_no_overlapping_windows(windows: list[TimeWindow]) -> None:
    """Validate that windows for the same weekday do not overlap."""
    sorted_windows = sorted(windows, key=lambda w: w.start_time)
    for i in range(len(sorted_windows) - 1):
        current_w = sorted_windows[i]
        next_w = sorted_windows[i + 1]
        if current_w.end_time > next_w.start_time:
            raise AppError(
                status_code=422,
                code="OVERLAPPING_AVAILABILITY_WINDOWS",
                message=(
                    f"Overlapping time windows detected: {current_w.start_time.strftime('%H:%M')}–"
                    f"{current_w.end_time.strftime('%H:%M')} overlaps with "
                    f"{next_w.start_time.strftime('%H:%M')}–{next_w.end_time.strftime('%H:%M')}."
                ),
            )


def generate_slots_for_date(
    target_date: date,
    slot_minutes: int,
    windows_for_day: list[TimeWindow],
    is_on_leave: bool,
    existing_appointments: list[BookedInterval],
    now_utc: datetime,
    clinic_tz: ZoneInfo,
    buffer_minutes: int = 0,
    booking_window_days: int = 60,
) -> list[GeneratedSlot]:
    """Pure slot generator for a single date.

    Returns a list of free GeneratedSlot objects in UTC.
    """
    if slot_minutes not in (15, 30):
        raise AppError(
            status_code=422,
            code="INVALID_SLOT_MINUTES",
            message=f"Slot duration must be 15 or 30 minutes, got {slot_minutes}.",
        )

    # Convert current UTC time to clinic local date
    clinic_now = now_utc.astimezone(clinic_tz)
    today_clinic = clinic_now.date()

    # Rule: Target date in the past returns no slots
    if target_date < today_clinic:
        return []

    # Rule: Target date beyond max booking window returns no slots
    max_date = today_clinic + timedelta(days=booking_window_days)
    if target_date > max_date:
        return []

    # Rule: If doctor is on leave on this date, ALL slots are suppressed
    if is_on_leave:
        return []

    if not windows_for_day:
        return []

    # Validate windows do not overlap
    validate_no_overlapping_windows(windows_for_day)

    slot_delta = timedelta(minutes=slot_minutes)
    buffer_delta = timedelta(minutes=buffer_minutes)
    cutoff_utc = now_utc + buffer_delta

    # Filter out active appointments that overlap with target date
    active_appointments = [
        appt for appt in existing_appointments
        if appt.status in ("booked", "completed", "no_show")
    ]

    generated_slots: list[GeneratedSlot] = []

    # Process each availability window
    for window in sorted(windows_for_day, key=lambda w: w.start_time):
        # Construct timezone-aware local start and end datetimes
        win_start_local = datetime.combine(target_date, window.start_time, tzinfo=clinic_tz)
        win_end_local = datetime.combine(target_date, window.end_time, tzinfo=clinic_tz)

        # Convert to UTC
        win_start_utc = win_start_local.astimezone(timezone.utc)
        win_end_utc = win_end_local.astimezone(timezone.utc)

        current_slot_start = win_start_utc
        while current_slot_start + slot_delta <= win_end_utc:
            current_slot_end = current_slot_start + slot_delta

            # Drop past slots
            if current_slot_start <= cutoff_utc:
                current_slot_start += slot_delta
                continue

            # Drop slots overlapping any existing active appointment
            overlaps = any(
                current_slot_start < appt.end_at and current_slot_end > appt.start_at
                for appt in active_appointments
            )

            if not overlaps:
                # Format local representations for convenience
                local_start_dt = current_slot_start.astimezone(clinic_tz)
                local_end_dt = current_slot_end.astimezone(clinic_tz)

                generated_slots.append(
                    GeneratedSlot(
                        start_at=current_slot_start,
                        end_at=current_slot_end,
                        local_start=local_start_dt.strftime("%H:%M"),
                        local_end=local_end_dt.strftime("%H:%M"),
                    )
                )

            current_slot_start += slot_delta

    return generated_slots
