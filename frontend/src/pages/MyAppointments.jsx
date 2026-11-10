import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  AlertTriangle,
  RotateCcw,
  XCircle,
  CheckCircle2,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { addDaysInClinicTimezone, formatClinicFullDate, formatClinicTime, getTodayClinicDate } from '../utils/dateUtils';

export default function MyAppointments() {
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
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [selectedNewSlot, setSelectedNewSlot] = useState(null);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const [upData, pastData] = await Promise.all([
        api.appointments.upcoming(),
        api.appointments.past(),
      ]);
      setUpcoming(upData);
      setPast(pastData);
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
      fetchAppointments();
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
    setRescheduleDate(addDaysInClinicTimezone(new Date(), 1));
  };

  // Load slots when rescheduleDate or doctor changes
  useEffect(() => {
    if (!reschedulingAppt || !rescheduleDate) return;
    async function loadNewSlots() {
      setLoadingRescheduleSlots(true);
      setSelectedNewSlot(null);
      try {
        const data = await api.doctors.getSlots(reschedulingAppt.doctor_id, rescheduleDate);
        setRescheduleSlots(data.slots || []);
      } catch (err) {
        addToast(err.message || 'Failed to fetch slots for rescheduling', 'error');
      } finally {
        setLoadingRescheduleSlots(false);
      }
    }
    loadNewSlots();
  }, [reschedulingAppt, rescheduleDate]);

  // Submit Atomic Reschedule
  const handleConfirmReschedule = async () => {
    if (!reschedulingAppt || !selectedNewSlot) return;
    setSubmittingReschedule(true);
    try {
      await api.appointments.reschedule(
        reschedulingAppt.id,
        selectedNewSlot.start_at,
        reschedulingAppt.reason,
      );
      addToast('Appointment successfully rescheduled to new slot!', 'success');
      setReschedulingAppt(null);
      fetchAppointments();
    } catch (err) {
      addToast(err.message || 'Reschedule failed', 'error');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  // Format date / time strings using clinic timezone
  const formatTime = (isoString) => formatClinicTime(isoString);
  const formatDate = (isoString) => formatClinicFullDate(isoString);

  return (
    <div style={{ padding: '2.5rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="mono-label">[CONSULTATION LEDGER]</span>
          <h1 style={{ marginTop: '0.25rem' }}>My Appointments</h1>
          <p style={{ marginTop: '0.35rem' }}>
            Review upcoming visits, access real-time status updates, or manage rescheduling.
          </p>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'upcoming' ? '2px solid var(--color-black)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.75rem 0.5rem',
              fontWeight: activeTab === 'upcoming' ? 700 : 500,
              color: activeTab === 'upcoming' ? 'var(--color-black)' : 'var(--text-muted)',
              minHeight: 'auto',
            }}
          >
            Upcoming ({upcoming.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'past' ? '2px solid var(--color-black)' : '2px solid transparent',
              borderRadius: 0,
              padding: '0.75rem 0.5rem',
              fontWeight: activeTab === 'past' ? 700 : 500,
              color: activeTab === 'past' ? 'var(--color-black)' : 'var(--text-muted)',
              minHeight: 'auto',
            }}
          >
            Past & Cancelled ({past.length})
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <span className="mono">[FETCHING APPOINTMENT LEDGER...]</span>
          </div>
        ) : activeTab === 'upcoming' ? (
          /* Upcoming Tab */
          upcoming.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--border-color)',
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
              }}
            >
              <Calendar size={32} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
              <div className="mono" style={{ fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                [NO UPCOMING APPOINTMENTS]
              </div>
              <p style={{ marginBottom: '1.25rem' }}>
                You have no scheduled consultations. Find a physician and book an open slot.
              </p>
              <button
                className="btn-primary"
                onClick={() => (window.location.href = '/doctors')}
              >
                Browse Doctors
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {upcoming.map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'var(--color-white)',
                    padding: '1.5rem',
                    boxShadow: '4px 4px 0 0 #000000',
                  }}
                >
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span className="status-badge booked">BOOKED</span>
                        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID #{appt.id}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.35rem' }}>{appt.doctor_name}</h3>
                      <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {appt.doctor_speciality}
                      </span>
                    </div>

                    {/* Date and Time Box */}
                    <div
                      style={{
                        border: '1px solid var(--border-color)',
                        padding: '0.65rem 1rem',
                        background: 'var(--color-gray-50)',
                        textAlign: 'right',
                      }}
                    >
                      <div className="mono" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {formatDate(appt.start_at)}
                      </div>
                      <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {formatTime(appt.start_at)} — {formatTime(appt.end_at)}
                      </div>
                    </div>
                  </div>

                  {/* Consultation Reason (if given) */}
                  {appt.reason && (
                    <div
                      style={{
                        fontSize: '0.85rem',
                        marginBottom: '1rem',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--color-gray-50)',
                        borderLeft: '2px solid var(--color-black)',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Reason: </span>
                      {appt.reason}
                    </div>
                  )}

                  {/* Footer Actions & Cutoff Status */}
                  <div
                    style={{
                      borderTop: '1px solid var(--color-gray-200)',
                      paddingTop: '1rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    {/* 2-Hour Cutoff Notice */}
                    {!appt.can_cancel_or_reschedule ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          color: 'var(--color-black)',
                          fontWeight: 600,
                        }}
                      >
                        <AlertTriangle size={15} />
                        <span>Changes locked: within 2 hours of consultation</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Can cancel or reschedule until 2 hours before start time
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-outline"
                        disabled={!appt.can_cancel_or_reschedule}
                        onClick={() => openRescheduleModal(appt)}
                        style={{ fontSize: '0.82rem', minHeight: '44px', padding: '0.4rem 0.9rem' }}
                      >
                        <RotateCcw size={14} /> Reschedule
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        disabled={!appt.can_cancel_or_reschedule}
                        onClick={() => setCancellingAppt(appt)}
                        style={{ fontSize: '0.82rem', minHeight: '44px', padding: '0.4rem 0.9rem' }}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Past Tab */
          past.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--border-color)',
                padding: '3rem 1.5rem',
                textAlign: 'center',
              }}
            >
              <div className="mono" style={{ fontSize: '0.85rem' }}>[NO PAST CONSULTATIONS RECORDED]</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {past.map((appt) => (
                <div
                  key={appt.id}
                  style={{
                    border: '1px solid var(--color-gray-300)',
                    padding: '1.25rem',
                    background: 'var(--color-white)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span className={`status-badge ${appt.status}`}>{appt.status}</span>
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{appt.id}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.15rem' }}>{appt.doctor_name}</h4>
                    <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {appt.doctor_speciality}
                    </span>
                  </div>

                  <div className="mono" style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{formatDate(appt.start_at)}</div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {formatTime(appt.start_at)} — {formatTime(appt.end_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AnimatePresence>
        {cancellingAppt && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
            onClick={() => setCancellingAppt(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '460px',
                maxHeight: 'calc(100vh - 2rem)',
                overflowY: 'auto',
                background: '#ffffff',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.35rem' }}>Cancel Appointment</h3>
              <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Are you sure you want to cancel your consultation with{' '}
                <strong>{cancellingAppt.doctor_name}</strong> scheduled for{' '}
                <strong>{formatDate(cancellingAppt.start_at)}</strong> at{' '}
                <strong>{formatTime(cancellingAppt.start_at)}</strong>?
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                This slot will be immediately freed up for other patients.
              </p>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal (Reuses Date Picker & Free Slot Grid) */}
      <AnimatePresence>
        {reschedulingAppt && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
            onClick={() => setReschedulingAppt(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '520px',
                background: '#ffffff',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                padding: '2rem',
                boxShadow: 'var(--shadow-modal)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <span className="mono-label" style={{ color: 'var(--color-teal-700)', fontWeight: 700 }}>
                    [ATOMIC RESCHEDULE]
                  </span>
                  <h3 style={{ marginTop: '0.2rem', fontSize: '1.35rem' }}>Reschedule Appointment</h3>
                </div>
                <button
                  onClick={() => setReschedulingAppt(null)}
                  style={{ background: 'none', border: 'none', minHeight: 'auto', padding: '0.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div
                style={{
                  fontSize: '0.85rem',
                  padding: '1rem',
                  background: 'var(--color-slate-50)',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                }}
              >
                <div><strong>Doctor:</strong> {reschedulingAppt.doctor_name} ({reschedulingAppt.doctor_speciality})</div>
                <div style={{ marginTop: '0.25rem' }}><strong>Current:</strong> {formatDate(reschedulingAppt.start_at)} at {formatTime(reschedulingAppt.start_at)}</div>
              </div>

              {/* Date Input */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Select New Date</label>
                <input
                  type="date"
                  min={getTodayClinicDate()}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="form-input mono"
                />
              </div>

              {/* Available Slots Grid */}
              <div style={{ marginBottom: '1.5rem' }}>
                <span className="mono-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Available Free Slots ({rescheduleSlots.length})
                </span>
                {loadingRescheduleSlots ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                    <span className="mono">[LOOKING FOR FREE SLOTS...]</span>
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed var(--border-color)',
                      padding: '1.5rem',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                    }}
                  >
                    No slots available on this date. Please pick another date.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                      gap: '0.5rem',
                    }}
                  >
                    {rescheduleSlots.map((slot) => {
                      const isSelected = selectedNewSlot?.start_at === slot.start_at;
                      return (
                        <button
                          key={slot.start_at}
                          type="button"
                          onClick={() => setSelectedNewSlot(slot)}
                          className={isSelected ? 'btn-primary' : 'btn-outline'}
                          style={{
                            fontSize: '0.85rem',
                            minHeight: '44px',
                            padding: '0.4rem',
                          }}
                        >
                          <span className="mono">{slot.local_start}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
