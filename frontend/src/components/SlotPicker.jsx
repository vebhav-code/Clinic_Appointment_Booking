import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Sunrise, Sun, Moon, CalendarX, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  addDaysInClinicTimezone,
  formatClinicFullDate,
  formatToClinicDate,
  getNextDaysInClinicTimezone,
  getTodayClinicDate,
} from '../utils/dateUtils';
import { SlotChipsSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

export default function SlotPicker({
  doctorId,
  selectedDate,
  onDateChange,
  selectedSlot,
  onSlotSelect,
  nextAvailableDate,
  onSlotsRefreshed,
}) {
  const [slotsData, setSlotsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const todayStr = getTodayClinicDate();
  const maxDateStr = addDaysInClinicTimezone(new Date(), 60);
  const days14 = getNextDaysInClinicTimezone(14);

  // Fetch slots whenever doctorId or selectedDate changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchSlots() {
      if (!doctorId || !selectedDate) return;
      setLoading(true);
      try {
        const data = await api.doctors.getSlots(doctorId, selectedDate);
        if (!isCancelled) {
          setSlotsData(data);
          if (onSlotsRefreshed) onSlotsRefreshed(data);
        }
      } catch (err) {
        if (!isCancelled) {
          addToast(err.message || 'Failed to load slots for this date', 'error');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchSlots();

    return () => {
      isCancelled = true;
    };
  }, [doctorId, selectedDate]);

  // Group slots into Morning, Afternoon, and Evening
  const allSlots = slotsData?.slots || [];
  const morningSlots = allSlots.filter((s) => s.local_start < '12:00');
  const afternoonSlots = allSlots.filter((s) => s.local_start >= '12:00' && s.local_start < '17:00');
  const eveningSlots = allSlots.filter((s) => s.local_start >= '17:00');

  const handleNextAvailableClick = () => {
    if (nextAvailableDate) {
      onDateChange(nextAvailableDate);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Date Selection Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span className="section-label">Step 1</span>
            <h3 style={{ fontSize: '1.1rem', margin: '0.15rem 0 0' }}>Select Date</h3>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {formatClinicFullDate(selectedDate)}
          </span>
        </div>

        {/* 14-Day Scrollable Strip */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.6rem',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}
          role="tablist"
          aria-label="Select consultation date"
        >
          {days14.map((day) => {
            const isSelected = selectedDate === day.ymd;
            return (
              <button
                key={day.ymd}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  onDateChange(day.ymd);
                  if (onSlotSelect) onSlotSelect(null);
                }}
                className={isSelected ? 'btn-primary' : 'btn-outline'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '68px',
                  minHeight: '74px',
                  padding: '0.5rem 0.4rem',
                  borderRadius: 'var(--radius-md)',
                  flexShrink: 0,
                  gap: '0.15rem',
                  position: 'relative',
                }}
              >
                {day.isNewMonth && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: isSelected ? 'rgba(255, 255, 255, 0.9)' : 'var(--color-primary-700)',
                    }}
                  >
                    {day.month}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                    opacity: isSelected ? 0.95 : 0.75,
                  }}
                >
                  {day.isToday ? 'Today' : day.weekday}
                </span>
                <span
                  className="mono"
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {day.dayNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* More Dates Native Picker */}
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label htmlFor="more-dates-input" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <CalendarIcon size={14} aria-hidden="true" />
            <span>Or choose any date within 60 days:</span>
          </label>
          <input
            id="more-dates-input"
            type="date"
            value={selectedDate}
            min={todayStr}
            max={maxDateStr}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(e.target.value);
                if (onSlotSelect) onSlotSelect(null);
              }
            }}
            className="form-input"
            style={{
              width: 'auto',
              minHeight: '40px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.875rem',
              borderRadius: 'var(--radius-sm)',
            }}
          />
        </div>
      </div>

      {/* 2. Slot Selection Section */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span className="section-label">Step 2</span>
          <h3 style={{ fontSize: '1.1rem', margin: '0.15rem 0 0' }}>Select Time Slot</h3>
        </div>

        {loading ? (
          <SlotChipsSkeleton />
        ) : slotsData?.is_on_leave ? (
          <EmptyState
            icon={CalendarX}
            title="Practitioner on leave"
            description={slotsData.leave_reason || 'The practitioner is unavailable on this date.'}
            actionLabel={nextAvailableDate ? 'Try next available day' : undefined}
            onAction={nextAvailableDate ? handleNextAvailableClick : undefined}
            actionIcon={ArrowRight}
          />
        ) : allSlots.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No free slots on this date"
            description="All appointment slots for this date are fully booked or have already passed."
            actionLabel={nextAvailableDate ? 'Try next available day' : undefined}
            onAction={nextAvailableDate ? handleNextAvailableClick : undefined}
            actionIcon={ArrowRight}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Morning */}
            {morningSlots.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', color: 'var(--color-primary-800)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Sunrise size={16} aria-hidden="true" />
                  <span>Morning ({morningSlots.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.55rem' }}>
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.start_at === slot.start_at;
                    return (
                      <button
                        key={slot.start_at}
                        type="button"
                        onClick={() => onSlotSelect(slot)}
                        className={isSelected ? 'btn-primary' : 'btn-outline'}
                        style={{
                          minHeight: '44px',
                          padding: '0.4rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.925rem',
                        }}
                      >
                        <span className="mono">{slot.local_start}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Afternoon */}
            {afternoonSlots.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', color: 'var(--color-primary-800)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Sun size={16} aria-hidden="true" />
                  <span>Afternoon ({afternoonSlots.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.55rem' }}>
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.start_at === slot.start_at;
                    return (
                      <button
                        key={slot.start_at}
                        type="button"
                        onClick={() => onSlotSelect(slot)}
                        className={isSelected ? 'btn-primary' : 'btn-outline'}
                        style={{
                          minHeight: '44px',
                          padding: '0.4rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.925rem',
                        }}
                      >
                        <span className="mono">{slot.local_start}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Evening */}
            {eveningSlots.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', color: 'var(--color-primary-800)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Moon size={16} aria-hidden="true" />
                  <span>Evening ({eveningSlots.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.55rem' }}>
                  {eveningSlots.map((slot) => {
                    const isSelected = selectedSlot?.start_at === slot.start_at;
                    return (
                      <button
                        key={slot.start_at}
                        type="button"
                        onClick={() => onSlotSelect(slot)}
                        className={isSelected ? 'btn-primary' : 'btn-outline'}
                        style={{
                          minHeight: '44px',
                          padding: '0.4rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.925rem',
                        }}
                      >
                        <span className="mono">{slot.local_start}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

