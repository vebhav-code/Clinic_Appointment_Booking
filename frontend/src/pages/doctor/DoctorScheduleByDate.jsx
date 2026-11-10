import React, { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  UserX,
  Mail,
  Phone,
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { getTodayClinicDate, formatClinicTime, formatClinicFullDate } from '../../utils/dateUtils';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { QueueRowSkeleton } from '../../components/Skeleton';

export default function DoctorScheduleByDate() {
  const [selectedDate, setSelectedDate] = useState(getTodayClinicDate);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const { addToast } = useToast();

  const fetchSchedule = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const data = await api.doctor.getAppointmentsByDate(selectedDate);
      setAppointments(data || []);
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
      addToast(
        `Appointment #${appointmentId} marked as ${status === 'no_show' ? 'No-Show' : 'Completed'}.`,
        'success'
      );
      fetchSchedule();
    } catch (err) {
      addToast(err.message || 'Status update failed', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatTime = (isoString) => formatClinicTime(isoString);

  const isFuture = (startAtIso) => {
    return new Date(startAtIso).getTime() > Date.now();
  };

  return (
    <div style={{ padding: '2rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <span className="section-label">Appointment Ledger</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: '0.2rem 0 0.35rem' }}>
            Schedule by Date
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Inspect booked, completed, and past consultations across any selected calendar date.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
            <CalendarIcon size={18} style={{ color: 'var(--color-primary-600)' }} aria-hidden="true" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Select Date:</span>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input mono"
            style={{ width: 'auto', minWidth: '180px', minHeight: '44px' }}
          />

          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Viewing: <strong>{formatClinicFullDate(selectedDate)}</strong>
          </span>
        </div>

        {/* Results List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <QueueRowSkeleton />
            <QueueRowSkeleton />
          </div>
        ) : appointments.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 1.5rem' }}>
            <EmptyState
              icon={CalendarIcon}
              title={`No appointments on ${formatClinicFullDate(selectedDate)}`}
              description="There are no consultations scheduled or completed for this selected date."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {appointments.map((appt) => {
              const inFuture = isFuture(appt.start_at);
              const isBooked = appt.status === 'booked';

              return (
                <div
                  key={appt.id}
                  className="card"
                  style={{
                    padding: '1.35rem 1.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.25rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={appt.status} />
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{appt.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                      {appt.patient_name}
                    </h3>

                    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {appt.patient_email && (
                        <span
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Mail size={14} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                          <span>{appt.patient_email}</span>
                        </span>
                      )}

                      {appt.patient_phone && (
                        <span
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Phone size={14} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                          <span>{appt.patient_phone}</span>
                        </span>
                      )}
                    </div>

                    {appt.reason && (
                      <p style={{ margin: '0.65rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Reason: </strong>
                        {appt.reason}
                      </p>
                    )}
                  </div>

                  {/* Right: Time Slot & Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '0.75rem',
                      minWidth: '220px',
                    }}
                  >
                    <div
                      className="mono"
                      style={{
                        padding: '0.4rem 0.85rem',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-slate-50)',
                        fontSize: '0.925rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {formatTime(appt.start_at)} – {formatTime(appt.end_at)}
                    </div>

                    {isBooked && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        {inFuture && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Clock size={12} aria-hidden="true" />
                            <span>Action unlocks at {formatTime(appt.start_at)}</span>
                          </span>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={inFuture || updatingId === appt.id}
                            onClick={() => handleUpdateStatus(appt.id, 'completed')}
                            title={inFuture ? `Unlocks at ${formatTime(appt.start_at)}` : 'Mark appointment completed'}
                          >
                            <CheckCircle2 size={15} aria-hidden="true" />
                            <span>Completed</span>
                          </button>

                          <button
                            type="button"
                            className="btn-danger-outline btn-sm"
                            disabled={inFuture || updatingId === appt.id}
                            onClick={() => handleUpdateStatus(appt.id, 'no_show')}
                            title={inFuture ? `Unlocks at ${formatTime(appt.start_at)}` : 'Mark patient as no-show'}
                          >
                            <UserX size={15} aria-hidden="true" />
                            <span>No-Show</span>
                          </button>
                        </div>
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
