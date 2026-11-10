import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  AlertTriangle,
  RotateCcw,
  XCircle,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Lock,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  formatClinicDeadline,
  formatClinicFullDate,
  formatClinicTime,
  getRelativeClinicDateLabel,
  getTodayClinicDate,
  getUpcomingCountdown,
} from '../utils/dateUtils';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import SlotPicker from '../components/SlotPicker';
import { AppointmentCardSkeleton } from '../components/Skeleton';

export default function MyAppointments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Cancel Modal state
  const [cancellingAppt, setCancellingAppt] = useState(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Reschedule Modal state
  const [reschedulingAppt, setReschedulingAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const [upData, pastData] = await Promise.all([
        api.appointments.upcoming(),
        api.appointments.past(),
      ]);
      // Sort upcoming ascending (nearest first)
      const sortedUpcoming = (upData || []).sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      );
      // Sort past descending (newest first)
      const sortedPast = (pastData || []).sort(
        (a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
      );
      setUpcoming(sortedUpcoming);
      setPast(sortedPast);
    } catch (err) {
      addToast(err.message || 'Failed to fetch appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Cancel Handler
  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    setSubmittingCancel(true);
    try {
      await api.appointments.cancel(cancellingAppt.id);
      addToast('Appointment cancelled successfully.', 'info');
      setCancellingAppt(null);
      await fetchAppointments();
    } catch (err) {
      addToast(err.message || 'Failed to cancel appointment', 'error');
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (appt) => {
    setReschedulingAppt(appt);
    setSelectedNewSlot(null);
    setRescheduleDate(getTodayClinicDate());
  };

  // Submit Atomic Reschedule
  const handleConfirmReschedule = async () => {
    if (!reschedulingAppt || !selectedNewSlot) return;
    setSubmittingReschedule(true);
    try {
      await api.appointments.reschedule(
        reschedulingAppt.id,
        selectedNewSlot.start_at,
        reschedulingAppt.reason
      );
      addToast('Appointment successfully rescheduled!', 'success');
      setReschedulingAppt(null);
      await fetchAppointments();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        addToast(err.message || 'Selected slot was taken. Please select another slot.', 'error', 6000);
        setSelectedNewSlot(null);
      } else {
        addToast(err.message || 'Failed to reschedule appointment', 'error');
      }
    } finally {
      setSubmittingReschedule(false);
    }
  };

  return (
    <div style={{ padding: '2rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <span className="section-label">Consultations</span>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: '0.2rem 0 0.35rem' }}>
            My Appointments
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Track upcoming clinic visits, manage bookings, or review your consultation history.
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            gap: '1.5rem',
            marginBottom: '1.75rem',
          }}
          role="tablist"
          aria-label="Appointment view filter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            onClick={() => setActiveTab('upcoming')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'upcoming' ? '2.5px solid var(--color-primary-600)' : '2.5px solid transparent',
              borderRadius: 0,
              padding: '0.65rem 0.25rem',
              fontWeight: activeTab === 'upcoming' ? 700 : 500,
              color: activeTab === 'upcoming' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
              minHeight: 'auto',
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Upcoming</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: activeTab === 'upcoming' ? 'var(--color-primary-100)' : 'var(--color-slate-100)',
                color: activeTab === 'upcoming' ? 'var(--color-primary-800)' : 'var(--text-muted)',
              }}
            >
              {upcoming.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'past'}
            onClick={() => setActiveTab('past')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'past' ? '2.5px solid var(--color-primary-600)' : '2.5px solid transparent',
              borderRadius: 0,
              padding: '0.65rem 0.25rem',
              fontWeight: activeTab === 'past' ? 700 : 500,
              color: activeTab === 'past' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
              minHeight: 'auto',
              cursor: 'pointer',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>Past & Cancelled</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: activeTab === 'past' ? 'var(--color-primary-100)' : 'var(--color-slate-100)',
                color: activeTab === 'past' ? 'var(--color-primary-800)' : 'var(--text-muted)',
              }}
            >
              {past.length}
            </span>
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
          </div>
        ) : activeTab === 'upcoming' ? (
          /* Upcoming Tab */
          upcoming.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 1.5rem' }}>
              <EmptyState
                icon={Calendar}
                title="No upcoming appointments"
                description="You don't have any consultations scheduled. Browse our medical directory to book an open slot."
                actionLabel="Find a Doctor"
                onAction={() => navigate('/doctors')}
                actionIcon={ArrowRight}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {upcoming.map((appt, idx) => {
                const isNearest = idx === 0;
                const countdown = isNearest ? getUpcomingCountdown(appt.start_at) : { isWithin24Hours: false, label: '' };
                const relativeLabel = getRelativeClinicDateLabel(appt.start_at);

                return (
                  <div
                    key={appt.id}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      border: isNearest ? '1.5px solid var(--color-primary-500)' : undefined,
                      boxShadow: isNearest ? 'var(--shadow-md)' : undefined,
                      position: 'relative',
                    }}
                  >
                    {/* Header Row: Doctor + Status + Countdown */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '1rem',
                        marginBottom: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                          <StatusBadge status={appt.status} />

                          {isNearest && (
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
                              Next Appointment
                            </span>
                          )}

                          {countdown.isWithin24Hours && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Clock size={12} aria-hidden="true" />
                              <span>{countdown.label}</span>
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem' }}>
                          {appt.doctor_name}
                        </h3>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {appt.doctor_speciality}
                        </span>
                      </div>

                      {/* Date & Time Highlight Box */}
                      <div
                        style={{
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.65rem 1rem',
                          background: 'var(--color-slate-50)',
                          textAlign: 'right',
                          minWidth: '180px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', marginBottom: '0.15rem' }}>
                          {relativeLabel && (
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--color-primary-700)',
                                backgroundColor: 'var(--color-primary-50)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              {relativeLabel}
                            </span>
                          )}
                          <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {formatClinicFullDate(appt.start_at)}
                          </span>
                        </div>
                        <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatClinicTime(appt.start_at)} – {formatClinicTime(appt.end_at)}
                        </div>
                      </div>
                    </div>

                    {/* Consultation Reason (if provided) */}
                    {appt.reason && (
                      <div
                        style={{
                          fontSize: '0.875rem',
                          marginBottom: '1rem',
                          padding: '0.65rem 0.85rem',
                          background: 'var(--color-slate-50)',
                          borderLeft: '3px solid var(--color-primary-500)',
                          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong style={{ color: 'var(--text-primary)' }}>Reason: </strong>
                        {appt.reason}
                      </div>
                    )}

                    {/* Footer Actions & Cutoff Status */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '0.85rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      {/* Cancellation & Reschedule Locking Info */}
                      {!appt.can_cancel_or_reschedule ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem',
                            color: '#b45309',
                            fontWeight: 500,
                          }}
                        >
                          <Lock size={14} aria-hidden="true" />
                          <span>
                            Changes locked (cutoff was{' '}
                            {formatClinicDeadline(appt.cancellation_deadline)})
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <ShieldCheck size={14} style={{ color: 'var(--color-primary-600)' }} aria-hidden="true" />
                          <span>
                            Free changes until{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>
                              {formatClinicDeadline(appt.cancellation_deadline)}
                            </strong>
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-outline btn-sm"
                          disabled={!appt.can_cancel_or_reschedule}
                          onClick={() => openRescheduleModal(appt)}
                          title={!appt.can_cancel_or_reschedule ? 'Locked within 2 hours of appointment' : 'Change appointment time'}
                        >
                          <RotateCcw size={14} aria-hidden="true" />
                          <span>Reschedule</span>
                        </button>
                        <button
                          type="button"
                          className="btn-danger-outline btn-sm"
                          disabled={!appt.can_cancel_or_reschedule}
                          onClick={() => setCancellingAppt(appt)}
                          title={!appt.can_cancel_or_reschedule ? 'Locked within 2 hours of appointment' : 'Cancel appointment'}
                        >
                          <XCircle size={14} aria-hidden="true" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Past & Cancelled Tab */
          past.length === 0 ? (
            <div className="card" style={{ padding: '3.5rem 1.5rem' }}>
              <EmptyState
                icon={CalendarCheck}
                title="No past consultations"
                description="You do not have any past or cancelled consultations recorded in your history."
                actionLabel="Browse Doctors"
                onAction={() => navigate('/doctors')}
                actionIcon={ArrowRight}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {past.map((appt) => (
                <div
                  key={appt.id}
                  className="card"
                  style={{
                    padding: '1.15rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <StatusBadge status={appt.status} />
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{appt.id}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 0.15rem', color: 'var(--text-primary)' }}>
                      {appt.doctor_name}
                    </h4>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {appt.doctor_speciality}
                    </span>
                    {appt.reason && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        "{appt.reason}"
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <div className="mono" style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatClinicFullDate(appt.start_at)}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {formatClinicTime(appt.start_at)} – {formatClinicTime(appt.end_at)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-outline btn-sm"
                      onClick={() => navigate(`/doctors/${appt.doctor_id}`)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <span>Book again</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!cancellingAppt}
        onClose={() => setCancellingAppt(null)}
        title="Cancel Appointment"
      >
        {cancellingAppt && (
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
                <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Slot will be released immediately</strong>
                Are you sure you want to cancel? This appointment slot will be freed up for other patients.
              </div>
            </div>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                background: 'var(--color-slate-50)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Doctor:</span>
                <span style={{ fontWeight: 600 }}>{cancellingAppt.doctor_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <span className="mono" style={{ fontWeight: 600 }}>{formatClinicFullDate(cancellingAppt.start_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Time:</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {formatClinicTime(cancellingAppt.start_at)} – {formatClinicTime(cancellingAppt.end_at)}
                </span>
              </div>
              {cancellingAppt.reason && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Reason:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{cancellingAppt.reason}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setCancellingAppt(null)}
                disabled={submittingCancel}
                style={{ minHeight: '44px' }}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmCancel}
                disabled={submittingCancel}
                style={{ minHeight: '44px' }}
              >
                {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal (Reusing SlotPicker) */}
      <Modal
        isOpen={!!reschedulingAppt}
        onClose={() => setReschedulingAppt(null)}
        title="Reschedule Appointment"
      >
        {reschedulingAppt && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Current Appointment Summary */}
            <div
              style={{
                fontSize: '0.875rem',
                padding: '0.85rem 1rem',
                background: 'var(--color-slate-50)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Doctor:</span>
                <span style={{ fontWeight: 600 }}>{reschedulingAppt.doctor_name} ({reschedulingAppt.doctor_speciality})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Time:</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {formatClinicFullDate(reschedulingAppt.start_at)} at {formatClinicTime(reschedulingAppt.start_at)}
                </span>
              </div>
            </div>

            {/* Reusable SlotPicker */}
            <SlotPicker
              doctorId={reschedulingAppt.doctor_id}
              selectedDate={rescheduleDate}
              onDateChange={(d) => {
                setRescheduleDate(d);
                setSelectedNewSlot(null);
              }}
              selectedSlot={selectedNewSlot}
              onSlotSelect={setSelectedNewSlot}
            />

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <button
                type="button"
                className="btn-outline"
                onClick={() => setReschedulingAppt(null)}
                disabled={submittingReschedule}
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmReschedule}
                disabled={!selectedNewSlot || submittingReschedule}
                style={{ minHeight: '44px' }}
              >
                {submittingReschedule ? 'Rescheduling...' : 'Confirm Reschedule'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
