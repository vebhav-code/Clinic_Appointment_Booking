import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Trash2,
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarX,
  CalendarCheck,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  getTodayClinicDate,
  formatClinicFullDate,
  formatToClinicDate,
} from '../../utils/dateUtils';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DoctorLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const { addToast } = useToast();

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Modal states for clicking dates on calendar
  const [addLeaveModalOpen, setAddLeaveModalOpen] = useState(false);
  const [unblockModalDate, setUnblockModalDate] = useState(null);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await api.doctor.getLeaves();
      setLeaves(data || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch leave records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleBlockDate = async (e) => {
    if (e) e.preventDefault();
    if (!leaveDate) return;
    setConflictError('');
    setSubmitting(true);

    try {
      await api.doctor.blockLeave(leaveDate, reason.trim() || null);
      addToast(`Leave for ${leaveDate} successfully blocked.`, 'success');
      setLeaveDate('');
      setReason('');
      setAddLeaveModalOpen(false);
      await fetchLeaves();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(err.message);
      } else {
        addToast(err.message || 'Failed to block leave date', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnblockDate = async (dateStr) => {
    try {
      await api.doctor.unblockLeave(dateStr);
      addToast(`Date ${dateStr} unblocked. Normal availability restored.`, 'info');
      setUnblockModalDate(null);
      await fetchLeaves();
    } catch (err) {
      addToast(err.message || 'Failed to unblock date', 'error');
    }
  };

  const todayStr = getTodayClinicDate();

  // Calendar navigation
  const prevMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Build calendar matrix
  const currentYear = calendarMonth.getFullYear();
  const currentMonth = calendarMonth.getMonth();
  const monthTitle = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Monday = 0, Sunday = 6
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  const calendarDays = [];
  // Leading empty slots
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const ymd = `${currentYear}-${mm}-${dd}`;
    calendarDays.push({ day, ymd });
  }

  const handleDayClick = (ymd) => {
    if (ymd < todayStr) return; // Cannot modify past dates
    const isLeave = leaves.some((l) => l.date === ymd);
    if (isLeave) {
      setUnblockModalDate(ymd);
    } else {
      setLeaveDate(ymd);
      setReason('');
      setAddLeaveModalOpen(true);
    }
  };

  return (
    <div style={{ padding: '2rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <span className="section-label">Schedule Exceptions</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: '0.2rem 0 0.35rem' }}>
            Doctor Leave Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Block individual dates off for planned leave or conferences. When blocked, appointment slots are automatically hidden.
          </p>
        </div>

        {/* Conflict Error Notice */}
        {conflictError && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              fontSize: '0.9rem',
              lineHeight: 1.45,
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
            <div>
              <strong style={{ display: 'block', marginBottom: '0.15rem' }}>Cannot Block Date</strong>
              {conflictError}
            </div>
          </div>
        )}

        {/* Main Grid: Mini-Calendar + Quick Form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
            marginBottom: '2rem',
          }}
        >
          {/* Left: Mini-Calendar */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={18} style={{ color: 'var(--color-primary-600)' }} aria-hidden="true" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{monthTitle}</h3>
              </div>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  style={{ padding: '0.35rem' }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={nextMonth}
                  aria-label="Next month"
                  style={{ padding: '0.35rem' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Calendar Weekday Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.25rem',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              {WEEKDAYS_SHORT.map((w) => (
                <div key={w} style={{ padding: '0.25rem 0' }}>
                  {w}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.35rem',
              }}
            >
              {calendarDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} style={{ height: '38px' }} />;
                }

                const { day, ymd } = cell;
                const isPast = ymd < todayStr;
                const isToday = ymd === todayStr;
                const isBlocked = leaves.some((l) => l.date === ymd);

                let bg = 'transparent';
                let color = 'var(--text-primary)';
                let border = '1px solid transparent';
                let cursor = 'pointer';

                if (isPast) {
                  color = 'var(--color-slate-300)';
                  cursor = 'not-allowed';
                } else if (isBlocked) {
                  bg = '#fee2e2';
                  color = '#991b1b';
                  border = '1px solid #fca5a5';
                } else if (isToday) {
                  border = '1px solid var(--color-primary-400)';
                  color = 'var(--color-primary-800)';
                  bg = 'var(--color-primary-50)';
                }

                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={isPast}
                    onClick={() => handleDayClick(ymd)}
                    title={
                      isBlocked
                        ? `${ymd}: Blocked (click to unblock)`
                        : isPast
                        ? `${ymd}: Past date`
                        : `${ymd}: Click to block leave`
                    }
                    style={{
                      height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      border,
                      background: bg,
                      color,
                      fontSize: '0.85rem',
                      fontWeight: isBlocked || isToday ? 700 : 500,
                      cursor,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{day}</span>
                    {isBlocked && (
                      <span
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          backgroundColor: '#dc2626',
                          marginTop: '1px',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div
              style={{
                display: 'flex',
                gap: '1.25rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-subtle)',
                justifyContent: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <span>Blocked Leave</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary-600)' }} />
                <span>Today</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-slate-200)' }} />
                <span>Open Date</span>
              </div>
            </div>
          </div>

          {/* Right: Manual Block Form */}
          <div className="card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem', color: 'var(--text-primary)' }}>
              Block a Specific Date
            </h3>

            <form onSubmit={handleBlockDate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="leave-date-input">
                  Leave Date
                </label>
                <input
                  id="leave-date-input"
                  type="date"
                  min={todayStr}
                  required
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="form-input mono"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="leave-reason-input">
                  Reason <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  id="leave-reason-input"
                  type="text"
                  placeholder="e.g. Medical conference, Annual holiday..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !leaveDate}
                style={{ width: '100%', minHeight: '44px', marginTop: '0.25rem' }}
              >
                {submitting ? (
                  <span>Blocking Date...</span>
                ) : (
                  <>
                    <Plus size={16} aria-hidden="true" />
                    <span>Block Leave Date</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Blocked Dates List */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.15rem', color: 'var(--text-primary)' }}>
                Active Blocked Dates ({leaves.length})
              </h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No appointment slots will be generated on these dates.
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <span className="mono" style={{ fontSize: '0.875rem' }}>Loading leave schedule...</span>
            </div>
          ) : leaves.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No leave dates scheduled"
              description="You have no upcoming leave blocked. Your practice is operating normally according to your weekly windows."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {leaves.map((leave) => (
                <div
                  key={leave.id || leave.date}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--color-slate-50)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {formatClinicFullDate(leave.date)}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {leave.reason || 'Personal / General Leave'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-danger-outline btn-sm"
                    onClick={() => setUnblockModalDate(leave.date)}
                    title="Unblock this day"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Unblock</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Leave from Calendar Click */}
      <Modal
        isOpen={addLeaveModalOpen}
        onClose={() => setAddLeaveModalOpen(false)}
        title="Block Leave Date"
      >
        <form onSubmit={handleBlockDate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Selected Date:</span>
            <div className="mono" style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
              {formatClinicFullDate(leaveDate)}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-reason-input">
              Reason for Absence <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
            </label>
            <input
              id="modal-reason-input"
              type="text"
              placeholder="e.g. Medical conference, Personal leave..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-input"
              style={{ minHeight: '44px' }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setAddLeaveModalOpen(false)}
              disabled={submitting}
              style={{ minHeight: '44px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ minHeight: '44px' }}
            >
              {submitting ? 'Blocking...' : 'Confirm Block'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Unblock Confirmation */}
      <Modal
        isOpen={!!unblockModalDate}
        onClose={() => setUnblockModalDate(null)}
        title="Unblock Date"
      >
        {unblockModalDate && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to unblock <strong>{formatClinicFullDate(unblockModalDate)}</strong>? Normal recurring clinic slots will be restored for booking.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setUnblockModalDate(null)}
                style={{ minHeight: '44px' }}
              >
                Keep Blocked
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleUnblockDate(unblockModalDate)}
                style={{ minHeight: '44px' }}
              >
                Unblock Date
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
