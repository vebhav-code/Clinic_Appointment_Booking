import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle2, UserX } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function DoctorScheduleByDate() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const { addToast } = useToast();

  const fetchSchedule = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const data = await api.doctor.getAppointmentsByDate(selectedDate);
      setAppointments(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch appointments for this date', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  const handleUpdateStatus = async (appointmentId, status) => {
    setUpdatingId(appointmentId);
    try {
      await api.doctor.updateStatus(appointmentId, status);
      addToast(`Status updated to ${status}.`, 'success');
      fetchSchedule();
    } catch (err) {
      addToast(err.message || 'Status update failed', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isFuture = (startAtIso) => {
    return new Date(startAtIso).getTime() > Date.now();
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="mono-label">[APPOINTMENT ROSTER]</span>
          <h1 style={{ marginTop: '0.25rem' }}>Schedule by Date</h1>
          <p style={{ marginTop: '0.35rem' }}>
            Inspect booked, completed, and past consultations across any selected calendar date.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            padding: '1.25rem',
            background: 'var(--color-white)',
            marginBottom: '2rem',
            boxShadow: '4px 4px 0 0 #000000',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} />
            <span className="form-label" style={{ marginBottom: 0 }}>
              Select Date:
            </span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input mono"
            style={{ width: '200px', height: '42px' }}
          />
        </div>

        {/* Results List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <span className="mono">[LOADING APPOINTMENTS FOR {selectedDate}...]</span>
          </div>
        ) : appointments.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--border-color)',
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <span className="mono" style={{ fontSize: '0.9rem' }}>
              [NO APPOINTMENTS ON {selectedDate}]
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {appointments.map((appt) => {
              const inFuture = isFuture(appt.start_at);
              const isBooked = appt.status === 'booked';

              return (
                <div
                  key={appt.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'var(--color-white)',
                    padding: '1.5rem',
                    boxShadow: '3px 3px 0 0 #000000',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{appt.id}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem' }}>{appt.patient_name}</h3>
                    <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {appt.patient_email}
                    </span>
                    {appt.reason && (
                      <p style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                        <strong>Reason:</strong> {appt.reason}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                    <div
                      className="mono"
                      style={{
                        padding: '0.4rem 0.8rem',
                        border: '1px solid var(--border-color)',
                        background: 'var(--color-gray-50)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                      }}
                    >
                      {formatTime(appt.start_at)} — {formatTime(appt.end_at)}
                    </div>

                    {isBooked && (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={inFuture || updatingId === appt.id}
                          onClick={() => handleUpdateStatus(appt.id, 'completed')}
                          style={{ fontSize: '0.75rem', minHeight: '34px', padding: '0.25rem 0.7rem' }}
                        >
                          <CheckCircle2 size={13} /> Completed
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          disabled={inFuture || updatingId === appt.id}
                          onClick={() => handleUpdateStatus(appt.id, 'no_show')}
                          style={{ fontSize: '0.75rem', minHeight: '34px', padding: '0.25rem 0.7rem' }}
                        >
                          <UserX size={13} /> No-Show
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
