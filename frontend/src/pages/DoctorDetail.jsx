import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Download,
  Info,
  ShieldCheck,
  Check,
  ArrowRight,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  formatClinicFullDate,
  formatClinicTime,
  formatToClinicDate,
  getTodayClinicDate,
} from '../utils/dateUtils';
import SlotPicker from '../components/SlotPicker';
import { DoctorHeaderSkeleton } from '../components/Skeleton';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const AVATAR_COLORS = ['#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#059669'];

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { isAuthenticated, role } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  const [selectedDate, setSelectedDate] = useState(getTodayClinicDate);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotPickerKey, setSlotPickerKey] = useState(0);

  // Booking Modal & Success state
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingReason, setBookingReason] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [downloadingIcs, setDownloadingIcs] = useState(false);

  // 1. Fetch Doctor Profile
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

  // Proceed to confirmation modal
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

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setSubmittingBooking(true);
    try {
      const created = await api.appointments.book(
        Number(id),
        selectedSlot.start_at,
        bookingReason.trim() || null
      );
      addToast('Appointment successfully booked!', 'success');
      setBookedAppointment(created);
      setBookingModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        addToast(err.message || 'This slot was just booked by someone else. Please pick another slot.', 'error', 6000);
        setBookingModalOpen(false);
        setSelectedSlot(null);
        // Force slot picker refresh
        setSlotPickerKey((k) => k + 1);
      } else {
        addToast(err.message || 'Failed to book appointment', 'error');
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Download .ics calendar event
  const handleDownloadIcs = async () => {
    if (!bookedAppointment?.id) return;
    setDownloadingIcs(true);
    try {
      await api.appointments.downloadIcs(bookedAppointment.id);
      addToast('Calendar event downloaded successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to download calendar event', 'error');
    } finally {
      setDownloadingIcs(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="container" style={{ padding: '2.5rem 1rem' }}>
        <DoctorHeaderSkeleton />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <EmptyState
          icon={AlertTriangle}
          title="Doctor not found"
          description="The practitioner profile you are looking for does not exist or has been removed."
          actionLabel="Back to doctors directory"
          onAction={() => navigate('/doctors')}
          actionIcon={ArrowLeft}
        />
      </div>
    );
  }

  const avatarBg = AVATAR_COLORS[(doctor.id || 0) % AVATAR_COLORS.length];
  const initials = doctor.full_name
    ? doctor.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DR';

  // Determine current step index for the 3-step indicator
  let currentStep = 1;
  if (bookedAppointment) {
    currentStep = 3;
  } else if (bookingModalOpen) {
    currentStep = 3;
  } else if (selectedSlot) {
    currentStep = 2;
  } else if (selectedDate) {
    currentStep = 2;
  }

  return (
    <div style={{ padding: '2rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Back Link */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            to="/doctors"
            style={{
              textDecoration: 'none',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 500,
              fontSize: '0.9rem',
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Doctors Directory</span>
          </Link>
        </div>

        {/* Doctor Header Card */}
        <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: avatarBg,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-sm)',
                }}
                aria-hidden="true"
              >
                {initials}
              </div>

              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      background: 'var(--color-primary-50)',
                      color: 'var(--color-primary-700)',
                      border: '1px solid var(--color-primary-200)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {doctor.speciality}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={13} aria-hidden="true" />
                    <span>{doctor.slot_minutes} min consultation</span>
                  </span>
                </div>

                <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
                  {doctor.full_name}
                </h1>

                <p style={{ maxWidth: '640px', fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {doctor.bio || 'General medical consultation and specialist clinical care.'}
                </p>
              </div>
            </div>

            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1.25rem',
                minWidth: '160px',
                background: 'var(--color-slate-50)',
              }}
            >
              <span className="section-label" style={{ fontSize: '0.72rem' }}>
                Consultation Fee
              </span>
              <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                ₹{doctor.consultation_fee ? Number(doctor.consultation_fee).toFixed(0) : '400'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Per visit</span>
            </div>
          </div>
        </div>

        {/* 3-Step Indicator */}
        <div className="step-indicator" role="navigation" aria-label="Booking steps">
          <div className={`step-item ${currentStep === 1 ? 'active' : 'completed'}`}>
            <span className="step-circle">{currentStep > 1 ? <Check size={14} /> : '1'}</span>
            <span>1. Choose Date</span>
          </div>
          <div className="step-divider" aria-hidden="true" />
          <div className={`step-item ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}>
            <span className="step-circle">{currentStep > 2 ? <Check size={14} /> : '2'}</span>
            <span>2. Choose Time</span>
          </div>
          <div className="step-divider" aria-hidden="true" />
          <div className={`step-item ${currentStep === 3 ? 'active' : ''}`}>
            <span className="step-circle">{bookedAppointment ? <Check size={14} /> : '3'}</span>
            <span>3. Confirmation</span>
          </div>
        </div>

        {/* Success Screen OR Booking Layout */}
        {bookedAppointment ? (
          /* NEW Booking Success Screen */
          <div
            className="card"
            style={{
              maxWidth: '620px',
              margin: '0 auto',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <CheckCircle2 size={36} aria-hidden="true" />
            </div>

            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem' }}>
                Appointment Confirmed!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                Your consultation has been secured and confirmed.
              </p>
            </div>

            {/* Confirmed Appointment Details Card */}
            <div
              style={{
                width: '100%',
                background: 'var(--color-slate-50)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</span>
                <StatusBadge status={bookedAppointment.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Doctor</span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{doctor.full_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Speciality</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{doctor.speciality}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date</span>
                <span className="mono" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {formatClinicFullDate(bookedAppointment.start_at)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Time</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary-700)' }}>
                  {formatClinicTime(bookedAppointment.start_at)} – {formatClinicTime(bookedAppointment.end_at)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Consultation Fee</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  ₹{doctor.consultation_fee ? Number(doctor.consultation_fee).toFixed(0) : '400'}
                </span>
              </div>
            </div>

            {/* In-app reminder information */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'left', width: '100%' }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} aria-hidden="true" />
              <span>Free changes or cancellation up to 2 hours prior. In-app reminder will trigger 1 hour before.</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate('/my-appointments')}
                style={{ flex: 1, minWidth: '180px' }}
              >
                <span>View My Appointments</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="btn-outline"
                onClick={handleDownloadIcs}
                disabled={downloadingIcs}
                style={{ flex: 1, minWidth: '180px' }}
              >
                <Download size={16} aria-hidden="true" />
                <span>{downloadingIcs ? 'Downloading...' : 'Add to Calendar'}</span>
              </button>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setBookedAppointment(null);
                setSelectedSlot(null);
                setSlotPickerKey((k) => k + 1);
              }}
              style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}
            >
              Book another appointment
            </button>
          </div>
        ) : (
          /* Normal Booking Two-Column Layout */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: '2rem',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Doctor Operating Hours & Policy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Weekly Recurring Windows */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <span className="section-label">Schedule</span>
                <h3 style={{ fontSize: '1.1rem', margin: '0.2rem 0 0.85rem' }}>Weekly Operating Hours</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {!doctor.availability_rules || doctor.availability_rules.length === 0 ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      No recurring availability windows published yet.
                    </span>
                  ) : (
                    WEEKDAYS.map((dayName, idx) => {
                      const rules = doctor.availability_rules.filter((r) => r.weekday === idx);
                      if (rules.length === 0) return null;
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            paddingBottom: '0.4rem',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dayName}</span>
                          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                            {rules.map((r) => `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`).join(', ')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Clinic Policy Card */}
              <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--color-slate-50)' }}>
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                  <Info size={18} style={{ color: 'var(--color-primary-600)', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                  <div style={{ fontSize: '0.85rem', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                      Clinic Booking Policy
                    </strong>
                    Free cancellations or rescheduling up to 2 hours before the appointment. An in-app reminder
                    will be available 1 hour prior.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Slot Picker */}
            <div className="card" style={{ padding: '1.75rem', position: 'relative' }}>
              <SlotPicker
                key={slotPickerKey}
                doctorId={id}
                selectedDate={selectedDate}
                onDateChange={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                selectedSlot={selectedSlot}
                onSlotSelect={setSelectedSlot}
                nextAvailableDate={
                  doctor?.next_available_slot ? formatToClinicDate(doctor.next_available_slot.start_at) : null
                }
              />

              {/* Selected Slot & Continue Bar */}
              {selectedSlot && (
                <div className="booking-continue-bar">
                  <div>
                    <span className="section-label" style={{ fontSize: '0.7rem' }}>
                      Selected Slot
                    </span>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-primary-800)' }}>
                      {selectedSlot.local_start} — {selectedSlot.local_end}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleProceedToConfirm}
                    style={{ minHeight: '44px' }}
                  >
                    <span>Continue to Confirm</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={bookingModalOpen && !!selectedSlot}
        onClose={() => setBookingModalOpen(false)}
        title="Confirm Appointment"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Summary Details */}
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              background: 'var(--color-slate-50)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Physician</span>
              <span style={{ fontWeight: 600 }}>{doctor.full_name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Speciality</span>
              <span style={{ color: 'var(--text-secondary)' }}>{doctor.speciality}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date</span>
              <span className="mono" style={{ fontWeight: 600 }}>
                {formatClinicFullDate(selectedDate)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Time Slot</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--color-primary-700)' }}>
                {selectedSlot?.local_start} — {selectedSlot?.local_end}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '0.6rem',
                marginTop: '0.2rem',
              }}
            >
              <span style={{ fontWeight: 600 }}>Consultation Fee</span>
              <span className="mono" style={{ fontWeight: 700 }}>
                ₹{doctor.consultation_fee ? Number(doctor.consultation_fee).toFixed(0) : '400'}
              </span>
            </div>
          </div>

          {/* Consultation Reason (Optional) with character counter */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" htmlFor="reason-textarea" style={{ margin: 0 }}>
                Reason for Visit / Symptoms <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: bookingReason.length > 450 ? 'var(--color-amber-600)' : 'var(--text-muted)' }}>
                {bookingReason.length} / 500
              </span>
            </div>
            <textarea
              id="reason-textarea"
              rows={3}
              maxLength={500}
              value={bookingReason}
              onChange={(e) => setBookingReason(e.target.value)}
              className="form-textarea"
              placeholder="Describe your symptoms, health concerns, or follow-up needs..."
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
                <span>Securing Slot...</span>
              ) : (
                <>
                  <span>Confirm & Book</span>
                  <CheckCircle2 size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
