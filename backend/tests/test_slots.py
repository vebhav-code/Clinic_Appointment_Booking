"""Unit tests for pure slot generator service."""

from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

import pytest

from app.core.errors import AppError
from app.services.slot_generator import (
    BookedInterval,
    TimeWindow,
    generate_slots_for_date,
    validate_no_overlapping_windows,
)

KOLKATA_TZ = ZoneInfo("Asia/Kolkata")


def test_slot_generation_multiple_windows():
    """Verify slots are generated across multiple windows (morning and evening)."""
    target_date = date(2026, 11, 10)  # A Tuesday
    windows = [
        TimeWindow(start_time=time(10, 0), end_time=time(12, 0)),  # 10:00, 10:30, 11:00, 11:30 (4 slots)
        TimeWindow(start_time=time(17, 0), end_time=time(19, 0)),  # 17:00, 17:30, 18:00, 18:30 (4 slots)
    ]
    # Current time is morning at 08:00 UTC (13:30 IST on a previous day)
    now_utc = datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc)

    slots = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )

    assert len(slots) == 8
    local_starts = [s.local_start for s in slots]
    assert local_starts == [
        "10:00", "10:30", "11:00", "11:30",
        "17:00", "17:30", "18:00", "18:30"
    ]


def test_partial_slot_dropped():
    """Window of 50 minutes with 30-min slots generates exactly 1 slot (partial dropped)."""
    target_date = date(2026, 11, 10)
    windows = [
        TimeWindow(start_time=time(10, 0), end_time=time(10, 50)),
    ]
    now_utc = datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc)

    slots = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )

    # 10:00-10:30 fits. 10:30-11:00 ends after 10:50, so must be dropped.
    assert len(slots) == 1
    assert slots[0].local_start == "10:00"
    assert slots[0].local_end == "10:30"


def test_fifteen_vs_thirty_minute_slots():
    """15-min slot length yields twice as many slots as 30-min for a 1-hour window."""
    target_date = date(2026, 11, 10)
    windows = [TimeWindow(start_time=time(10, 0), end_time=time(11, 0))]
    now_utc = datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc)

    slots_30 = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )
    assert len(slots_30) == 2
    assert [s.local_start for s in slots_30] == ["10:00", "10:30"]

    slots_15 = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=15,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )
    assert len(slots_15) == 4
    assert [s.local_start for s in slots_15] == ["10:00", "10:15", "10:30", "10:45"]


def test_past_slots_excluded_freeze_time():
    """Slots earlier than current time on today's date are excluded."""
    today = date(2026, 11, 10)
    windows = [TimeWindow(start_time=time(10, 0), end_time=time(12, 0))]

    # Now is 10:45 AM IST on Nov 10 (05:15 UTC)
    now_utc = datetime(2026, 11, 10, 5, 15, tzinfo=timezone.utc)

    slots = generate_slots_for_date(
        target_date=today,
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )

    # 10:00-10:30 and 10:30-11:00 are in the past or already started (10:00 <= 10:45 and 10:30 <= 10:45)
    # Remaining slot should only be 11:00 and 11:30
    local_starts = [s.local_start for s in slots]
    assert local_starts == ["11:00", "11:30"]


def test_leave_day_returns_no_slots():
    """Doctor leave on target date suppresses all slots."""
    target_date = date(2026, 11, 10)
    windows = [TimeWindow(start_time=time(10, 0), end_time=time(13, 0))]
    now_utc = datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc)

    slots = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=True,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )

    assert slots == []


def test_booked_slot_removed_from_list():
    """An active appointment removes its overlapping slot from free slots."""
    target_date = date(2026, 11, 10)
    windows = [TimeWindow(start_time=time(10, 0), end_time=time(11, 30))]  # 10:00, 10:30, 11:00
    now_utc = datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc)

    # 10:30 to 11:00 IST is 05:00 to 05:30 UTC
    booked_start_utc = datetime(2026, 11, 10, 5, 0, tzinfo=timezone.utc)
    booked_end_utc = datetime(2026, 11, 10, 5, 30, tzinfo=timezone.utc)

    existing = [
        BookedInterval(start_at=booked_start_utc, end_at=booked_end_utc, status="booked")
    ]

    slots = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=existing,
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )

    local_starts = [s.local_start for s in slots]
    assert "10:30" not in local_starts
    assert local_starts == ["10:00", "11:00"]


def test_cancelled_appointment_slot_is_available():
    """A cancelled appointment does not block the slot."""
    target_date = date(2026, 11, 10)
    windows = [TimeWindow(start_time=time(10, 0), end_time=time(11, 0))]  # 10:00, 10:30
    now_utc = datetime(2026, 11, 9, 8, 0, tzinfo=timezone.utc)

    cancelled_start_utc = datetime(2026, 11, 10, 4, 30, tzinfo=timezone.utc)  # 10:00 IST
    cancelled_end_utc = datetime(2026, 11, 10, 5, 0, tzinfo=timezone.utc)

    existing = [
        BookedInterval(start_at=cancelled_start_utc, end_at=cancelled_end_utc, status="cancelled")
    ]

    slots = generate_slots_for_date(
        target_date=target_date,
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=existing,
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )

    local_starts = [s.local_start for s in slots]
    assert local_starts == ["10:00", "10:30"]


def test_overlapping_availability_windows_rejected():
    """Overlapping windows on the same weekday raise AppError."""
    overlapping = [
        TimeWindow(start_time=time(10, 0), end_time=time(13, 0)),
        TimeWindow(start_time=time(12, 0), end_time=time(15, 0)),
    ]

    with pytest.raises(AppError) as exc_info:
        validate_no_overlapping_windows(overlapping)

    assert exc_info.value.code == "OVERLAPPING_AVAILABILITY_WINDOWS"


def test_past_date_and_future_cutoff():
    """Dates in the past or beyond the 60-day window return empty lists."""
    now_utc = datetime(2026, 11, 10, 8, 0, tzinfo=timezone.utc)
    windows = [TimeWindow(start_time=time(10, 0), end_time=time(12, 0))]

    # Past date
    past_slots = generate_slots_for_date(
        target_date=date(2026, 11, 9),
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
    )
    assert past_slots == []

    # Beyond 60 days
    far_future_slots = generate_slots_for_date(
        target_date=date(2027, 2, 1),
        slot_minutes=30,
        windows_for_day=windows,
        is_on_leave=False,
        existing_appointments=[],
        now_utc=now_utc,
        clinic_tz=KOLKATA_TZ,
        booking_window_days=60,
    )
    assert far_future_slots == []
