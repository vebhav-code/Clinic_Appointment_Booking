import React, { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  UserX,
  Calendar,
  Mail,
  Phone,
  AlertTriangle,
  Users,
  Check,
  Hourglass,
  ArrowRight,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatClinicTime } from '../../utils/dateUtils';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { QueueRowSkeleton } from '../../components/Skeleton';

export default function DoctorToday() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [noShowModalAppt, setNoShowModalAppt] = useState(null);
  const { addToast } = useToast();

  const fetchToday = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await api.doctor.getTodayAppointments();
      setAppointments(data || []);
    } catch (err) {
      if (!isBackground) {
        addToast(err.message || "Failed to load today's schedule", 'error');
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchToday(false);

    // Poll every 60 seconds
    const intervalId = setInterval(() => {
      fetchToday(true);
    }, 60000);

    // Re-fetch when window regains focus without skeleton flash
    const handleFocus = () => {
      fetchToday(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleUpdateStatus = async (appointmentId, status) => {
    setUpdatingId(appointmentId);
    try {
      await api.doctor.updateStatus(appointmentId, status);
      addToast(
        `Appointment #${appointmentId} marked as ${status === 'no_show' ? 'No-Show' : 'Completed'}.`,
        'success'
      );
      await fetchToday(true);
    } catch (err) {
      addToast(err.message || 'Status update failed', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmNoShow = async () => {
    if (!noShowModalAppt) return;
    const apptId = noShowModalAppt.id;
    setNoShowModalAppt(null);
    await handleUpdateStatus(apptId, 'no_show');
  };

  const formatTime = (isoString) => formatClinicTime(isoString);

  // Check if appointment start time is in the future
  const isFuture = (startAtIso) => {
    return new Date(startAtIso).getTime() > Date.now();
  };

  // Metrics calculation
  const totalCount = appointments.length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;
  const noShowCount = appointments.filter((a) => a.status === 'no_show').length;
  const remainingCount = appointments.filter((a) => a.status === 'booked').length;

  // Find the single "Next up" appointment: first booked appointment in future
  const nextUpAppt = appointments.find((a) => a.status === 'booked' && isFuture(a.start_at));

  return (
    <div style={{ padding: '2rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <span className="section-label">Clinician Workspace</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: '0.2rem 0 0.35rem' }}>
            Today's Patient Queue
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Real-time schedule for today's consultations. Manage arrivals and update attendance.
          </p>
        </div>

        {/* 4 Metric Summary Chips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Visits
            </span>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {totalCount}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-700)', textTransform: 'uppercase' }}>
              Remaining
            </span>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary-700)', marginTop: '0.25rem' }}>
              {remainingCount}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#15803d', textTransform: 'uppercase' }}>
              Completed
            </span>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d', marginTop: '0.25rem' }}>
              {completedCount}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c', textTransform: 'uppercase' }}>
              No-Show
            </span>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b91c1c', marginTop: '0.25rem' }}>
              {noShowCount}
            </div>
          </div>
        </div>

        {/* Queue Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <QueueRowSkeleton />
            <QueueRowSkeleton />
            <QueueRowSkeleton />
          </div>
        ) : appointments.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 1.5rem' }}>
            <EmptyState
              icon={Calendar}
              title="No appointments scheduled for today"
              description="Your consultation roster is currently clear. Any patient bookings will appear here automatically."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {appointments.map((appt) => {
              const inFuture = isFuture(appt.start_at);
              const isBooked = appt.status === 'booked';
              const isNextUp = nextUpAppt && nextUpAppt.id === appt.id;

              return (
                <div
                  key={appt.id}
                  className="card"
                  style={{
                    padding: '1.35rem 1.5rem',
                    border: isNextUp ? '1.5px solid var(--color-primary-500)' : undefined,
                    boxShadow: isNextUp ? 'var(--shadow-md)' : undefined,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.25rem',
                    position: 'relative',
                  }}
                >
                  {/* Left: Patient and Details */}
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={appt.status} />

                      {isNextUp && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--color-primary-50)',
                            color: 'var(--color-primary-700)',
                            border: '1px solid var(--color-primary-200)',
                          }}
                        >
                          Next Up
                        </span>
                      )}

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
                        <strong style={{ color: 'var(--text-primary)' }}>Complaint: </strong>
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
                            onClick={() => setNoShowModalAppt(appt)}
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

      {/* No-Show Confirmation Modal */}
      <Modal
        isOpen={!!noShowModalAppt}
        onClose={() => setNoShowModalAppt(null)}
        title="Confirm No-Show"
      >
        {noShowModalAppt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                color: '#991b1b',
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
              <div style={{ fontSize: '0.875rem', lineHeight: 1.45 }}>
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Irreversible Status Change</strong>
                Are you sure you want to mark <strong>{noShowModalAppt.patient_name}</strong> as a No-Show for the{' '}
                {formatTime(noShowModalAppt.start_at)} slot? This will be recorded in clinic analytics and cannot be undone.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setNoShowModalAppt(null)}
                style={{ minHeight: '44px' }}
              >
                Back to Schedule
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmNoShow}
                style={{ minHeight: '44px' }}
              >
                Confirm No-Show
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
