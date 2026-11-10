import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Clock, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

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
  // schedule: array of 7 objects: { weekday: 0..6, windows: [{ start_time: '10:00', end_time: '13:00' }] }
  const [schedule, setSchedule] = useState(() =>
    WEEKDAYS.map((d) => ({ weekday: d.id, windows: [] }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    async function loadAvailability() {
      setLoading(true);
      try {
        const data = await api.doctor.getAvailability();
        setSlotMinutes(data.slot_minutes || 30);
        setConsultationFee(data.consultation_fee ? Number(data.consultation_fee) : 500);
        setBio(data.bio || '');

        // Transform flat rules to grouped schedule
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

  // Add Window to a specific weekday
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

  // Remove Window from a specific weekday
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

  // Update window time
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

  // Validate on client before submitting
  const validateForm = () => {
    setValidationError('');
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
        setValidationError(err.message);
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
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <span className="mono">[LOADING AVAILABILITY SCHEDULE...]</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem 0 5rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="mono-label">[CONFIGURATION]</span>
          <h1 style={{ marginTop: '0.25rem' }}>Availability Schedule</h1>
          <p style={{ marginTop: '0.35rem' }}>
            Set consultation slot duration and recurring operating windows per weekday.
          </p>
        </div>

        {validationError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-black)',
              color: 'var(--color-white)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Practice Parameters Box */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              padding: '1.5rem',
              background: 'var(--color-white)',
              marginBottom: '2rem',
              boxShadow: '4px 4px 0 0 #000000',
            }}
          >
            <h3 style={{ marginBottom: '1.25rem' }}>Practice Parameters</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              {/* Slot Duration */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Consultation Duration
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[15, 30].map((mins) => {
                    const active = slotMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSlotMinutes(mins)}
                        className={active ? 'btn-primary' : 'btn-outline'}
                        style={{ flex: 1 }}
                      >
                        <Clock size={14} /> {mins} Minutes
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>
                  Changes will be rejected if existing future booked appointments conflict with the new duration or operating windows.
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
          <div
            style={{
              border: '1px solid var(--border-color)',
              padding: '1.5rem',
              background: 'var(--color-white)',
              marginBottom: '2rem',
              boxShadow: '4px 4px 0 0 #000000',
            }}
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <h3>Weekly Operating Windows</h3>
              <p style={{ fontSize: '0.85rem' }}>
                Define multiple windows per day (e.g. 10:00–13:00 and 17:00–20:00). Partial slots at the window end will be dropped automatically.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {WEEKDAYS.map((day) => {
                const daySchedule = schedule.find((s) => s.weekday === day.id) || { windows: [] };
                return (
                  <div
                    key={day.id}
                    style={{
                      border: '1px solid var(--color-gray-300)',
                      padding: '1rem',
                      background: daySchedule.windows.length > 0 ? 'var(--color-white)' : 'var(--color-gray-50)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: daySchedule.windows.length > 0 ? '0.75rem' : 0,
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{day.name}</span>
                      <button
                        type="button"
                        onClick={() => handleAddWindow(day.id)}
                        className="btn-outline"
                        style={{ fontSize: '0.8rem', minHeight: '44px', padding: '0.4rem 0.8rem' }}
                      >
                        <Plus size={14} /> Add Window
                      </button>
                    </div>

                    {daySchedule.windows.length === 0 ? (
                      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        [OFF / NO OPERATING HOURS]
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {daySchedule.windows.map((win, wIdx) => (
                          <div
                            key={wIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
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
                            <span className="mono" style={{ fontSize: '0.85rem' }}>to</span>
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
                              className="btn-danger"
                              title="Delete window"
                              style={{ minHeight: '44px', minWidth: '44px', width: '44px', padding: 0 }}
                            >
                              <Trash2 size={16} />
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

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="mono">[SAVING...]</span> : <><span>Save Availability Schedule</span><Save size={16} /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
