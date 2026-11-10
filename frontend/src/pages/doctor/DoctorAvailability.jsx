import React, { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { AvailabilityFormSkeleton } from '../../components/Skeleton';

const WEEKDAYS = [
  { id: 0, name: 'Monday' },
  { id: 1, name: 'Tuesday' },
  { id: 2, name: 'Wednesday' },
  { id: 3, name: 'Thursday' },
  { id: 4, name: 'Friday' },
  { id: 5, name: 'Saturday' },
  { id: 6, name: 'Sunday' },
];

export default function DoctorAvailability() {
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [consultationFee, setConsultationFee] = useState(500);
  const [bio, setBio] = useState('');
  const [schedule, setSchedule] = useState(() =>
    WEEKDAYS.map((d) => ({ weekday: d.id, windows: [] }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [conflictError, setConflictError] = useState('');
  const { addToast } = useToast();

  // Copy to Other Days Modal state
  const [copySourceDay, setCopySourceDay] = useState(null); // { id, name }
  const [copyTargetDays, setCopyTargetDays] = useState([]); // array of weekday ids

  // Presets Modal state
  const [presetsModalOpen, setPresetsModalOpen] = useState(false);

  useEffect(() => {
    async function loadAvailability() {
      setLoading(true);
      try {
        const data = await api.doctor.getAvailability();
        setSlotMinutes(data.slot_minutes || 30);
        setConsultationFee(data.consultation_fee ? Number(data.consultation_fee) : 500);
        setBio(data.bio || '');

        const newSched = WEEKDAYS.map((d) => {
          const dayRules = (data.availability_rules || []).filter((r) => r.weekday === d.id);
          return {
            weekday: d.id,
            windows: dayRules.map((r) => ({
              start_time: r.start_time.slice(0, 5),
              end_time: r.end_time.slice(0, 5),
            })),
          };
        });
        setSchedule(newSched);
      } catch (err) {
        addToast(err.message || 'Failed to load availability', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAvailability();
  }, []);

  // Window operations
  const handleAddWindow = (weekdayId) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.weekday !== weekdayId) return item;
        return {
          ...item,
          windows: [...item.windows, { start_time: '10:00', end_time: '13:00' }],
        };
      })
    );
  };

  const handleRemoveWindow = (weekdayId, windowIndex) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.weekday !== weekdayId) return item;
        return {
          ...item,
          windows: item.windows.filter((_, idx) => idx !== windowIndex),
        };
      })
    );
  };

  const handleWindowChange = (weekdayId, windowIndex, field, value) => {
    setSchedule((prev) =>
      prev.map((item) => {
        if (item.weekday !== weekdayId) return item;
        const updated = [...item.windows];
        updated[windowIndex] = { ...updated[windowIndex], [field]: value };
        return { ...item, windows: updated };
      })
    );
  };

  // Slot calculation per day
  const calculateDaySlots = (windows, duration) => {
    if (!windows || windows.length === 0 || !duration) return 0;
    let total = 0;
    for (const w of windows) {
      if (!w.start_time || !w.end_time) continue;
      const [sh, sm] = w.start_time.split(':').map(Number);
      const [eh, em] = w.end_time.split(':').map(Number);
      const totalMinutes = eh * 60 + em - (sh * 60 + sm);
      if (totalMinutes > 0) {
        total += Math.floor(totalMinutes / duration);
      }
    }
    return total;
  };

  // Calculate total weekly slots
  const totalWeeklySlots = schedule.reduce((sum, day) => {
    return sum + calculateDaySlots(day.windows, slotMinutes);
  }, 0);

  // Copy schedule logic
  const openCopyModal = (day) => {
    setCopySourceDay(day);
    // Default targets: all weekdays except the source
    setCopyTargetDays([]);
  };

  const handleApplyCopy = () => {
    if (!copySourceDay || copyTargetDays.length === 0) return;
    const sourceSchedule = schedule.find((s) => s.weekday === copySourceDay.id);
    const clonedWindows = sourceSchedule ? sourceSchedule.windows.map((w) => ({ ...w })) : [];

    setSchedule((prev) =>
      prev.map((day) => {
        if (copyTargetDays.includes(day.weekday)) {
          return { ...day, windows: clonedWindows.map((w) => ({ ...w })) };
        }
        return day;
      })
    );

    addToast(`Schedule copied to ${copyTargetDays.length} day(s).`, 'success');
    setCopySourceDay(null);
    setCopyTargetDays([]);
  };

  // Preset schedules
  const applyPreset = (presetType) => {
    if (presetType === 'mon_fri_split') {
      // Mon-Fri: 09:00-13:00 & 14:00-18:00; Sat-Sun: off
      setSchedule(
        WEEKDAYS.map((d) => ({
          weekday: d.id,
          windows:
            d.id < 5
              ? [
                  { start_time: '09:00', end_time: '13:00' },
                  { start_time: '14:00', end_time: '18:00' },
                ]
              : [],
        }))
      );
      addToast('Applied preset: Mon–Fri 09:00–13:00 & 14:00–18:00', 'info');
    } else if (presetType === 'mon_sat_split') {
      // Mon-Sat: 10:00-13:00 & 17:00-20:00; Sun: off
      setSchedule(
        WEEKDAYS.map((d) => ({
          weekday: d.id,
          windows:
            d.id < 6
              ? [
                  { start_time: '10:00', end_time: '13:00' },
                  { start_time: '17:00', end_time: '20:00' },
                ]
              : [],
        }))
      );
      addToast('Applied preset: Mon–Sat 10:00–13:00 & 17:00–20:00', 'info');
    } else if (presetType === 'all_day_continuous') {
      // Mon-Sun: 09:00-17:00
      setSchedule(
        WEEKDAYS.map((d) => ({
          weekday: d.id,
          windows: [{ start_time: '09:00', end_time: '17:00' }],
        }))
      );
      addToast('Applied preset: All Days 09:00–17:00', 'info');
    } else if (presetType === 'clear_all') {
      setSchedule(WEEKDAYS.map((d) => ({ weekday: d.id, windows: [] })));
      addToast('All schedule windows cleared.', 'info');
    }
    setPresetsModalOpen(false);
  };

  // Validate form
  const validateForm = () => {
    setValidationError('');
    setConflictError('');

    for (const day of schedule) {
      const dayName = WEEKDAYS.find((d) => d.id === day.weekday)?.name;
      for (const w of day.windows) {
        if (w.start_time >= w.end_time) {
          setValidationError(
            `${dayName}: Window start time (${w.start_time}) must be earlier than end time (${w.end_time}).`
          );
          return false;
        }
      }

      // Check overlap
      const sorted = [...day.windows].sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].end_time > sorted[i + 1].start_time) {
          setValidationError(
            `${dayName}: Overlapping windows detected (${sorted[i].start_time}–${sorted[i].end_time} overlaps with ${sorted[i + 1].start_time}–${sorted[i + 1].end_time}).`
          );
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setConflictError('');
    try {
      await api.doctor.updateAvailability({
        slot_minutes: slotMinutes,
        consultation_fee: Number(consultationFee),
        bio: bio.trim() || null,
        schedule,
      });
      addToast('Availability schedule saved successfully!', 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setConflictError(err.message);
        } else {
          setValidationError(err.message);
        }
        addToast(err.message, 'error');
      } else {
        addToast(err.message || 'Failed to save availability', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2.5rem 1rem' }}>
        <AvailabilityFormSkeleton />
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 0 7rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <span className="section-label">Configuration</span>
            <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: '0.2rem 0 0.35rem' }}>
              Availability Schedule
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Set consultation slot length and weekly recurring availability windows per weekday.
            </p>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={() => setPresetsModalOpen(true)}
            style={{ minHeight: '44px' }}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>Schedule Presets</span>
          </button>
        </div>

        {/* Conflict / Validation Error Callout */}
        {(conflictError || validationError) && (
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
              <strong style={{ display: 'block', marginBottom: '0.15rem' }}>
                {conflictError ? 'Schedule Conflicts with Booked Appointments' : 'Validation Error'}
              </strong>
              {conflictError || validationError}
            </div>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Practice Parameters Card */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem', color: 'var(--text-primary)' }}>
              Practice Parameters
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {/* Consultation Duration */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Slot Duration
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {[15, 30].map((mins) => {
                    const active = slotMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSlotMinutes(mins)}
                        className={active ? 'btn-primary' : 'btn-outline'}
                        style={{ flex: 1, minHeight: '44px' }}
                      >
                        <Clock size={16} aria-hidden="true" />
                        <span>{mins} Minutes</span>
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.45rem' }}>
                  Future booked appointments will be checked against duration changes.
                </span>
              </div>

              {/* Consultation Fee */}
              <div>
                <label className="form-label" htmlFor="fee-input" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Consultation Fee (INR)
                </label>
                <input
                  id="fee-input"
                  type="number"
                  min="0"
                  step="50"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="form-input mono"
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>

            {/* Doctor Bio */}
            <div style={{ marginTop: '1.25rem' }}>
              <label className="form-label" htmlFor="bio-input" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Professional Biography
              </label>
              <textarea
                id="bio-input"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="form-textarea"
                placeholder="State your medical specialisation, qualifications, and clinical focus..."
              />
            </div>
          </div>

          {/* Weekly Windows Manager */}
          <div className="card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>
                  Weekly Operating Windows
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Define recurring consultation windows (e.g. 10:00–13:00 and 17:00–20:00).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {WEEKDAYS.map((day) => {
                const daySchedule = schedule.find((s) => s.weekday === day.id) || { windows: [] };
                const daySlots = calculateDaySlots(daySchedule.windows, slotMinutes);

                return (
                  <div
                    key={day.id}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.15rem',
                      background: daySchedule.windows.length > 0 ? '#ffffff' : 'var(--color-slate-50)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        marginBottom: daySchedule.windows.length > 0 ? '1rem' : 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', minWidth: '90px' }}>
                          {day.name}
                        </span>

                        {/* Live Slot Count Preview */}
                        {daySchedule.windows.length > 0 ? (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.55rem',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'var(--color-primary-50)',
                              color: 'var(--color-primary-700)',
                              border: '1px solid var(--color-primary-200)',
                            }}
                          >
                            = {daySlots} {daySlots === 1 ? 'slot' : 'slots'} ({slotMinutes} min)
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              fontWeight: 500,
                            }}
                          >
                            Off / Closed
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {daySchedule.windows.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openCopyModal(day)}
                            className="btn-outline btn-sm"
                            title={`Copy ${day.name}'s schedule to other days`}
                          >
                            <Copy size={13} aria-hidden="true" />
                            <span>Copy to...</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleAddWindow(day.id)}
                          className="btn-secondary btn-sm"
                        >
                          <Plus size={14} aria-hidden="true" />
                          <span>Add Window</span>
                        </button>
                      </div>
                    </div>

                    {daySchedule.windows.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {daySchedule.windows.map((win, wIdx) => (
                          <div
                            key={wIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <input
                              type="time"
                              value={win.start_time}
                              onChange={(e) =>
                                handleWindowChange(day.id, wIdx, 'start_time', e.target.value)
                              }
                              className="form-input mono"
                              style={{ width: '130px', minHeight: '44px', padding: '0.4rem 0.6rem' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>to</span>
                            <input
                              type="time"
                              value={win.end_time}
                              onChange={(e) =>
                                handleWindowChange(day.id, wIdx, 'end_time', e.target.value)
                              }
                              className="form-input mono"
                              style={{ width: '130px', minHeight: '44px', padding: '0.4rem 0.6rem' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveWindow(day.id, wIdx)}
                              className="btn-danger-outline btn-sm"
                              title="Delete window"
                              style={{ minHeight: '44px', minWidth: '44px', width: '44px', padding: 0 }}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Save Action Bar */}
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#ffffff',
              borderTop: '1px solid var(--border-default)',
              boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.08)',
              padding: '0.85rem 1.5rem calc(0.85rem + env(safe-area-inset-bottom, 0px))',
              zIndex: 100,
            }}
          >
            <div
              className="container"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Capacity:</span>
                <span className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary-800)' }}>
                  {totalWeeklySlots} slots / week
                </span>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ minHeight: '44px', minWidth: '220px' }}
              >
                {saving ? (
                  <span>Saving Schedule...</span>
                ) : (
                  <>
                    <Save size={16} aria-hidden="true" />
                    <span>Save Availability Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Copy Schedule Popover / Modal */}
      <Modal
        isOpen={!!copySourceDay}
        onClose={() => setCopySourceDay(null)}
        title={copySourceDay ? `Copy ${copySourceDay.name}'s Schedule` : 'Copy Schedule'}
      >
        {copySourceDay && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Select which weekdays should receive the exact same operating windows as{' '}
              <strong>{copySourceDay.name}</strong>.
            </p>

            {/* Quick selectors */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  const weekdaysOnly = WEEKDAYS.filter((d) => d.id < 5 && d.id !== copySourceDay.id).map(
                    (d) => d.id
                  );
                  setCopyTargetDays(weekdaysOnly);
                }}
              >
                Select Mon–Fri
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  const allOthers = WEEKDAYS.filter((d) => d.id !== copySourceDay.id).map((d) => d.id);
                  setCopyTargetDays(allOthers);
                }}
              >
                Select All Days
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setCopyTargetDays([])}
              >
                Clear
              </button>
            </div>

            {/* Day Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {WEEKDAYS.filter((d) => d.id !== copySourceDay.id).map((day) => {
                const checked = copyTargetDays.includes(day.id);
                return (
                  <label
                    key={day.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: checked ? 'var(--color-primary-50)' : 'var(--color-slate-50)',
                      border: checked ? '1px solid var(--color-primary-200)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: checked ? 600 : 400,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCopyTargetDays((prev) => [...prev, day.id]);
                        } else {
                          setCopyTargetDays((prev) => prev.filter((id) => id !== day.id));
                        }
                      }}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary-600)' }}
                    />
                    <span>{day.name}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setCopySourceDay(null)}
                style={{ minHeight: '44px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleApplyCopy}
                disabled={copyTargetDays.length === 0}
                style={{ minHeight: '44px' }}
              >
                <Check size={16} aria-hidden="true" />
                <span>Apply to {copyTargetDays.length} Day(s)</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Presets Modal */}
      <Modal
        isOpen={presetsModalOpen}
        onClose={() => setPresetsModalOpen(false)}
        title="Schedule Presets"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Choose a standard clinical operating pattern to quickly populate your recurring schedule.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              className="card card-interactive"
              onClick={() => applyPreset('mon_fri_split')}
              style={{ padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
            >
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Mon–Fri: 09:00–13:00 & 14:00–18:00
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Standard two-shift weekday practice. Saturday & Sunday closed.
              </span>
            </button>

            <button
              type="button"
              className="card card-interactive"
              onClick={() => applyPreset('mon_sat_split')}
              style={{ padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
            >
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Mon–Sat: 10:00–13:00 & 17:00–20:00
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Morning & Evening clinic sessions Monday to Saturday. Sunday closed.
              </span>
            </button>

            <button
              type="button"
              className="card card-interactive"
              onClick={() => applyPreset('all_day_continuous')}
              style={{ padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
            >
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                All Days: 09:00–17:00
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Full-time daily schedule 7 days a week.
              </span>
            </button>

            <button
              type="button"
              className="btn-danger-outline"
              onClick={() => applyPreset('clear_all')}
              style={{ justifyContent: 'center', marginTop: '0.5rem' }}
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>Clear All Operating Windows</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
