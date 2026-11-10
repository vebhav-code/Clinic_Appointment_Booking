import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, UserX, AlertCircle, Calendar } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatClinicTime } from '../../utils/dateUtils';

export default function DoctorToday() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const { addToast } = useToast();

  const fetchToday = async () => {
    setLoading(true);
    try {
      const data = await api.doctor.getTodayAppointments();
      setAppointments(data);
    } catch (err) {
      addToast(err.message || "Failed to load today's schedule", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  const handleUpdateStatus = async (appointmentId, status) => {
    setUpdatingId(appointmentId);
    try {
      await api.doctor.updateStatus(appointmentId, status);
      addToast(`Appointment #${appointmentId} marked as ${status}.`, 'success');
      fetchToday();
    } catch (err) {
      addToast(err.message || 'Status update failed', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (isoString) => formatClinicTime(isoString);

  // Check if appointment start time is in the future
  const isFuture = (startAtIso) => {
    return new Date(startAtIso).getTime() > Date.now();
  };

  return (
    <div style={{ padding: '2.5rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="mono-label">[CLINICIAN WORKSPACE]</span>
          <h1 style={{ marginTop: '0.25rem' }}>Today's Clinical Schedule</h1>
          <p style={{ marginTop: '0.35rem' }}>
            Time-ordered list of scheduled patient appointments for today. Mark arrivals as Completed or No-Show.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <span className="mono">[LOADING TODAY'S PATIENT QUEUE...]</span>
          </div>
        ) : appointments.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--border-color)',
              padding: '4rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <Calendar size={32} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
            <div className="mono" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              [NO APPOINTMENTS SCHEDULED TODAY]
            </div>
            <p>You have no patient consultations on the roster for today.</p>
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
                    gap: '1.25rem',
                  }}
                >
                  {/* Left: Patient and Time */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{appt.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.3rem' }}>{appt.patient_name}</h3>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        📧 {appt.patient_email}
                      </span>
                      {appt.patient_phone && (
                        <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          📞 {appt.patient_phone}
                        </span>
                      )}
                    </div>

                    {appt.reason && (
                      <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong>Complaint:</strong> {appt.reason}
                      </p>
                    )}
                  </div>

                  {/* Right: Time Slot & Doctor Actions */}
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {inFuture && (
                          <span
                            className="mono"
                            style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}
                          >
                            (Action unlocks at {formatTime(appt.start_at)})
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn-primary"
                          disabled={inFuture || updatingId === appt.id}
                          onClick={() => handleUpdateStatus(appt.id, 'completed')}
                          style={{ fontSize: '0.8rem', minHeight: '44px', padding: '0.4rem 0.85rem' }}
                        >
                          <CheckCircle2 size={15} /> Completed
                        </button>

                        <button
                          type="button"
                          className="btn-danger"
                          disabled={inFuture || updatingId === appt.id}
                          onClick={() => handleUpdateStatus(appt.id, 'no_show')}
                          style={{ fontSize: '0.8rem', minHeight: '44px', padding: '0.4rem 0.85rem' }}
                        >
                          <UserX size={15} /> No-Show
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
