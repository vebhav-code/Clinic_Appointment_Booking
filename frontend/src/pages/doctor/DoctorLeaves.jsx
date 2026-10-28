import React, { useEffect, useState } from 'react';
import { Calendar, Trash2, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { getTodayClinicDate } from '../../utils/dateUtils';

export default function DoctorLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState('');
  const { addToast } = useToast();

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await api.doctor.getLeaves();
      setLeaves(data);
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
    e.preventDefault();
    if (!leaveDate) return;
    setConflictError('');
    setSubmitting(true);

    try {
      await api.doctor.blockLeave(leaveDate, reason.trim() || null);
      addToast(`Leave date ${leaveDate} successfully blocked.`, 'success');
      setLeaveDate('');
      setReason('');
      fetchLeaves();
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
      fetchLeaves();
    } catch (err) {
      addToast(err.message || 'Failed to unblock date', 'error');
    }
  };

  const todayStr = getTodayClinicDate();

  return (
    <div style={{ padding: '2.5rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="mono-label">[SCHEDULE EXCEPTIONS]</span>
          <h1 style={{ marginTop: '0.25rem' }}>Doctor Leave Management</h1>
          <p style={{ marginTop: '0.35rem' }}>
            Block individual dates off for planned leave or conferences. When a date is blocked, all public slots for patients are automatically hidden.
          </p>
        </div>

        {/* Conflict Error Notice */}
        {conflictError && (
          <div
            style={{
              padding: '1rem',
              background: 'var(--color-black)',
              color: 'var(--color-white)',
              marginBottom: '1.75rem',
              border: '1px solid var(--color-black)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              fontSize: '0.9rem',
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Action Blocked: </strong>
              {conflictError}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2rem',
          }}
        >
          {/* Left: Block Date Form */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              padding: '1.75rem',
              background: 'var(--color-white)',
              boxShadow: '4px 4px 0 0 #000000',
              height: 'fit-content',
            }}
          >
            <h3 style={{ marginBottom: '1rem' }}>Block a Single Day</h3>

            <form onSubmit={handleBlockDate}>
              <div className="form-group">
                <label className="form-label" htmlFor="leave-date-input">
                  Select Date
                </label>
                <input
                  id="leave-date-input"
                  type="date"
                  min={todayStr}
                  required
                  value={leaveDate}
                  onChange={(e) => setLeaveDate(e.target.value)}
                  className="form-input mono"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="leave-reason-input">
                  Reason <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  id="leave-reason-input"
                  type="text"
                  placeholder="e.g. Medical Conference / Annual Leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {submitting ? <span className="mono">[BLOCKING DATE...]</span> : <><span>Block Leave Day</span><Plus size={16} /></>}
              </button>
            </form>
          </div>

          {/* Right: Active Leaves List */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              padding: '1.75rem',
              background: 'var(--color-white)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
              <h3>Blocked Dates ({leaves.length})</h3>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                [NO SLOTS OFFERED]
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <span className="mono">[LOADING LEAVE DATES...]</span>
              </div>
            ) : leaves.length === 0 ? (
              <div
                style={{
                  border: '1px dashed var(--border-color)',
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                }}
              >
                <span className="mono" style={{ fontSize: '0.85rem' }}>
                  No leave dates currently scheduled.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {leaves.map((leave) => (
                  <div
                    key={leave.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--color-gray-50)',
                    }}
                  >
                    <div>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {leave.date}
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {leave.reason || 'Personal / General Leave'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleUnblockDate(leave.date)}
                      title="Unblock this day"
                      style={{ fontSize: '0.75rem', minHeight: '34px', padding: '0.25rem 0.65rem' }}
                    >
                      <Trash2 size={13} /> Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
