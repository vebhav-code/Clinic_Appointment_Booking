import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  ArrowLeft,
  Check,
  AlertTriangle,
  Info,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addDaysInClinicTimezone, formatClinicFullDate, getTodayClinicDate } from '../utils/dateUtils';

// Weekday names mapping
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAuthenticated, role } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  const [selectedDate, setSelectedDate] = useState(getTodayClinicDate);
  const [slotsData, setSlotsData] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Booking Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingReason, setBookingReason] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // 1. Fetch Doctor Info
  useEffect(() => {
    async function loadDoctor() {
      setLoadingDoc(true);
      try {
        const data = await api.doctors.get(id);
        setDoctor(data);
      } catch (err) {
        addToast(err.message || 'Failed to load doctor profile', 'error');
      } finally {
        setLoadingDoc(false);
      }
    }
    loadDoctor();
  }, [id]);

  // 2. Fetch Slots for Selected Date
  const loadSlots = async () => {
    if (!id || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const data = await api.doctors.getSlots(id, selectedDate);
      setSlotsData(data);
    } catch (err) {
      addToast(err.message || 'Failed to fetch slots for this date', 'error');
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [id, selectedDate]);

  // Handle Booking Submission
  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setSubmittingBooking(true);
    try {
      await api.appointments.book(
        Number(id),
        selectedSlot.start_at,
        bookingReason.trim() || null,
      );
      addToast('Appointment successfully booked!', 'success');
      setBookingModalOpen(false);
      navigate('/my-appointments');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Race condition: slot taken by someone else
        addToast(err.message, 'error', 6000);
        setBookingModalOpen(false);
        // Refresh slot grid automatically
        loadSlots();
      } else {
        addToast(err.message || 'Failed to book appointment', 'error');
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleProceedToConfirm = () => {
    if (!isAuthenticated) {
      addToast('Please sign in or register as a patient to book this slot.', 'info');
      navigate('/login', { state: { from: `/doctors/${id}` } });
      return;
    }
    if (role === 'doctor') {
      addToast('Doctors cannot book appointments. Please log in with a patient account.', 'warning');
      return;
    }
    setBookingModalOpen(true);
  };

  // Group slots into Morning, Afternoon, and Evening
  const morningSlots = slotsData?.slots.filter((s) => s.local_start < '12:00') || [];
  const afternoonSlots = slotsData?.slots.filter((s) => s.local_start >= '12:00' && s.local_start < '17:00') || [];
  const eveningSlots = slotsData?.slots.filter((s) => s.local_start >= '17:00') || [];

  // Min and max date calculation using clinic timezone
  const todayStr = getTodayClinicDate();
  const maxDateStr = addDaysInClinicTimezone(new Date(), 60);

  if (loadingDoc) {
    return (
      <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>
        <span className="mono">[LOADING PRACTITIONER DETAILS...]</span>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>
        <h2>Practitioner Not Found</h2>
        <Link to="/doctors">
          <button className="btn-outline" style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} /> Back to Directory
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0 4rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Back Link */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to="/doctors"
            style={{
              textDecoration: 'none',
              color: 'var(--color-black)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Doctors Directory</span>
          </Link>
        </div>

        {/* Doctor Header Card */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            background: 'var(--color-white)',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '4px 4px 0 0 #000000',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span
                  className="mono"
                  style={{
                    background: 'var(--color-black)',
                    color: 'var(--color-white)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    textTransform: 'uppercase',
                  }}
                >
                  {doctor.speciality}
                </span>
                <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> {doctor.slot_minutes} MIN SLOTS
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', marginBottom: '0.5rem' }}>
                {doctor.full_name}
              </h1>
              <p style={{ maxWidth: '700px', fontSize: '0.95rem', lineHeight: 1.5 }}>
                {doctor.bio || 'General medical consultation and specialist clinical care.'}
              </p>
            </div>

            <div
              style={{
                border: '1px solid var(--border-color)',
                padding: '1rem 1.25rem',
                minWidth: '180px',
                background: 'var(--color-gray-50)',
              }}
            >
              <span className="mono-label" style={{ fontSize: '0.7rem' }}>
                CONSULTATION FEE
              </span>
              <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>
                ₹{doctor.consultation_fee ? Number(doctor.consultation_fee).toFixed(0) : '400'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Per appointment</span>
            </div>
          </div>
        </div>

        {/* Two-Column Booking Layout: Left = Date Picker & Rules, Right = Slot Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: '2rem',
          }}
        >
          {/* Left: Schedule Information & Date Picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Date Selection Box */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                background: 'var(--color-white)',
              }}
            >
              <div className="mono-label" style={{ marginBottom: '0.5rem' }}>
                [STEP 1: SELECT DATE]
              </div>
              <h3 style={{ marginBottom: '1rem' }}>Consultation Date</h3>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="date-picker-input">
                  Appointment Date (Clinic Timezone)
                </label>
                <input
                  id="date-picker-input"
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input mono"
                  style={{ height: '48px', fontSize: '0.95rem', fontWeight: 600 }}
                />
              </div>

              {/* Quick Date Presets */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[0, 1, 2, 3].map((offset) => {
                  const str = addDaysInClinicTimezone(new Date(), offset);
                  const label =
                    offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : `+${offset} Days`;
                  const active = selectedDate === str;
                  return (
                    <button
                      key={offset}
                      type="button"
                      onClick={() => setSelectedDate(str)}
                      className={active ? 'btn-primary' : 'btn-outline'}
                      style={{
                        fontSize: '0.82rem',
                        minHeight: '44px',
                        padding: '0.4rem 0.8rem',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weekly Recurring Windows Summary */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                padding: '1.5rem',
                background: 'var(--color-white)',
              }}
            >
              <div className="mono-label" style={{ marginBottom: '0.5rem' }}>
                [RECURRING SCHEDULE]
              </div>
              <h3 style={{ marginBottom: '0.75rem' }}>Weekly Operating Hours</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {doctor.availability_rules?.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    No recurring availability windows published yet.
                  </span>
                ) : (
                  WEEKDAYS.map((dayName, idx) => {
                    const rules = doctor.availability_rules?.filter((r) => r.weekday === idx) || [];
                    if (rules.length === 0) return null;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          borderBottom: '1px solid var(--color-gray-100)',
                          paddingBottom: '0.35rem',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{dayName}</span>
                        <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {rules
                            .map((r) => `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`)
                            .join(', ')}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right: Slots Grid */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              padding: '1.5rem',
              background: 'var(--color-white)',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '1rem',
              }}
            >
              <div>
                <span className="mono-label">[STEP 2: AVAILABLE SLOTS]</span>
                <h3 style={{ marginTop: '0.25rem' }}>
                  {formatClinicFullDate(selectedDate)}
                </h3>
              </div>
              {slotsData && (
                <span className="mono" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  {slotsData.slots.length} Free {slotsData.slots.length === 1 ? 'Slot' : 'Slots'}
                </span>
              )}
            </div>

            {/* Slots Content Area */}
            {loadingSlots ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem 0',
                }}
              >
                <span className="mono" style={{ fontSize: '0.85rem' }}>
                  [COMPUTING FREE SLOTS...]
                </span>
              </div>
            ) : slotsData?.is_on_leave ? (
              /* Doctor on Leave Warning State */
              <div
                style={{
                  border: '1px solid var(--color-black)',
                  background: 'var(--color-gray-100)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  margin: 'auto 0',
                }}
              >
                <AlertTriangle size={28} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                <h4 style={{ textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Doctor On Leave
                </h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  {slotsData.leave_reason || 'The practitioner has blocked this date for scheduled leave.'}
                </p>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  No appointment slots are offered on this date.
                </span>
              </div>
            ) : slotsData?.slots.length === 0 ? (
              /* Empty Slots State */
              <div
                style={{
                  border: '1px dashed var(--border-color)',
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  margin: 'auto 0',
                }}
              >
                <Clock size={28} style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  [NO FREE SLOTS AVAILABLE]
                </div>
                <p style={{ fontSize: '0.85rem' }}>
                  All slots on this date are either already booked, outside clinic hours, or in the past.
                </p>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                  Please pick another upcoming date.
                </span>
              </div>
            ) : (
              /* Free Slots Grouped by Morning / Afternoon / Evening */
              <div>
                {/* Morning Slots */}
                {morningSlots.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🌅</span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Morning Slots</h4>
                      <span className="badge" style={{ backgroundColor: 'var(--color-slate-100)', color: 'var(--color-slate-600)' }}>
                        {morningSlots.length} available
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.65rem' }}>
                      {morningSlots.map((slot) => {
                        const isSelected = selectedSlot?.start_at === slot.start_at;
                        return (
                          <button
                            key={slot.start_at}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={isSelected ? 'btn-primary' : 'btn-outline'}
                            style={{
                              padding: '0.6rem 0.4rem',
                              flexDirection: 'column',
                              minHeight: '48px',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                              {slot.local_start}
                            </span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                              to {slot.local_end}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {afternoonSlots.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>☀️</span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Afternoon Slots</h4>
                      <span className="badge" style={{ backgroundColor: 'var(--color-slate-100)', color: 'var(--color-slate-600)' }}>
                        {afternoonSlots.length} available
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.65rem' }}>
                      {afternoonSlots.map((slot) => {
                        const isSelected = selectedSlot?.start_at === slot.start_at;
                        return (
                          <button
                            key={slot.start_at}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={isSelected ? 'btn-primary' : 'btn-outline'}
                            style={{
                              padding: '0.6rem 0.4rem',
                              flexDirection: 'column',
                              minHeight: '48px',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                              {slot.local_start}
                            </span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                              to {slot.local_end}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Evening Slots */}
                {eveningSlots.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🌙</span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Evening Slots</h4>
                      <span className="badge" style={{ backgroundColor: 'var(--color-slate-100)', color: 'var(--color-slate-600)' }}>
                        {eveningSlots.length} available
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.65rem' }}>
                      {eveningSlots.map((slot) => {
                        const isSelected = selectedSlot?.start_at === slot.start_at;
                        return (
                          <button
                            key={slot.start_at}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={isSelected ? 'btn-primary' : 'btn-outline'}
                            style={{
                              padding: '0.6rem 0.4rem',
                              flexDirection: 'column',
                              minHeight: '48px',
                              borderRadius: 'var(--radius-md)',
                            }}
                          >
                            <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                              {slot.local_start}
                            </span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                              to {slot.local_end}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Continue to Booking Action Bar */}
                {selectedSlot && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      marginTop: '1.5rem',
                    }}
                  >
                    <div>
                      <span className="mono-label" style={{ fontSize: '0.7rem' }}>SELECTED APPOINTMENT SLOT</span>
                      <div className="mono" style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-primary-800)' }}>
                        {selectedSlot.local_start} — {selectedSlot.local_end}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleProceedToConfirm}
                    >
                      <span>Proceed to Confirm</span>
                      <Check size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      <AnimatePresence>
        {bookingModalOpen && selectedSlot && (
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
            onClick={() => setBookingModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '500px',
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
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <span className="mono-label" style={{ color: 'var(--color-teal-700)', fontWeight: 700 }}>
                    [CONFIRM APPOINTMENT]
                  </span>
                  <h3 style={{ marginTop: '0.2rem', fontSize: '1.35rem' }}>Appointment Summary</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    minHeight: 'auto',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Summary Details */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                  background: 'var(--color-slate-50)',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Physician:</span>
                  <span style={{ fontWeight: 700 }}>{doctor.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Speciality:</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{doctor.speciality}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{selectedDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Time Slot:</span>
                  <span className="mono" style={{ fontWeight: 700 }}>
                    {selectedSlot.local_start} — {selectedSlot.local_end}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    borderTop: '1px solid var(--color-gray-300)',
                    paddingTop: '0.5rem',
                    marginTop: '0.25rem',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>Fee:</span>
                  <span className="mono" style={{ fontWeight: 800 }}>
                    ₹{doctor.consultation_fee ? Number(doctor.consultation_fee).toFixed(0) : '400'}
                  </span>
                </div>
              </div>

              {/* Consultation Reason (Optional) */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="reason-textarea">
                  Reason for Visit / Symptoms <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <textarea
                  id="reason-textarea"
                  rows={3}
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  className="form-textarea"
                  placeholder="Describe your health concern, symptoms, or follow-up needs..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setBookingModalOpen(false)}
                  disabled={submittingBooking}
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmBooking}
                  disabled={submittingBooking}
                  style={{ minHeight: '44px' }}
                >
                  {submittingBooking ? (
                    <span className="mono">[SECURING SLOT...]</span>
                  ) : (
                    <>
                      <span>Confirm & Book</span>
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
