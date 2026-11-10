import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Clock, IndianRupee, ArrowRight, User, Stethoscope, Sparkles, Globe, Award } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatClinicFullDate, formatClinicTime, getRelativeClinicDateLabel } from '../utils/dateUtils';
import { DoctorCardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

// Deterministic soft palette for doctor avatars
const AVATAR_COLORS = [
  '#0d9488', // teal
  '#0284c7', // light blue
  '#2563eb', // blue
  '#7c3aed', // purple
  '#059669', // emerald
  '#d97706', // amber
  '#db2777', // pink
  '#4f46e5', // indigo
];

function getDoctorInitials(fullName) {
  if (!fullName) return 'DR';
  const clean = fullName.replace(/^Dr\.\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getAvatarColor(id = 0) {
  return AVATAR_COLORS[Math.abs(id) % AVATAR_COLORS.length];
}

export default function DoctorsList() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpeciality, setSelectedSpeciality] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    async function loadDoctors() {
      setLoading(true);
      try {
        const params = {};
        if (selectedSpeciality !== 'All') {
          params.speciality = selectedSpeciality;
        }
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        const data = await api.doctors.list(params);
        setDoctors(data);
      } catch (err) {
        addToast(err.message || 'Failed to load doctors list', 'error');
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadDoctors, 200);
    return () => clearTimeout(timer);
  }, [selectedSpeciality, searchTerm]);

  // Extract unique specialities from currently loaded doctors or fallback
  const specialities = useMemo(() => {
    const list = new Set();
    doctors.forEach((d) => {
      if (d.speciality) list.add(d.speciality);
    });
    // Add known common specialities if list is empty or sparse
    const defaults = [
      'General Physician',
      'Dermatologist',
      'Cardiologist',
      'Pediatrician',
      'Orthopedic Surgeon',
      'Gynecologist',
      'Neurologist',
      'Psychiatrist',
      'ENT Specialist',
      'Ophthalmologist',
      'Gastroenterologist',
      'Pulmonologist',
    ];
    defaults.forEach((s) => list.add(s));
    return ['All', ...Array.from(list).sort()];
  }, [doctors]);

  const clearFilters = () => {
    setSelectedSpeciality('All');
    setSearchTerm('');
  };

  return (
    <div style={{ padding: '2.5rem 0 4rem', minHeight: 'calc(100vh - 64px)' }}>
      <div className="container">
        {/* Page Heading */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="section-label">Medical Specialists</span>
          <h1 style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>Find a Doctor</h1>
          <p style={{ maxWidth: '620px', fontSize: '1rem' }}>
            Book appointments with verified clinic doctors. Real-time slot availability with guaranteed single-booking precision.
          </p>
        </div>

        {/* Filter and Search Container */}
        <div
          style={{
            marginBottom: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Speciality Filter Chips - Above search input, horizontally scrollable */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
              role="tablist"
              aria-label="Filter by speciality"
            >
              {specialities.map((spec) => {
                const isSelected = selectedSpeciality === spec;
                return (
                  <button
                    key={spec}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedSpeciality(spec)}
                    className={isSelected ? 'btn-primary' : 'btn-outline'}
                    style={{
                      fontSize: '0.85rem',
                      minHeight: '40px',
                      padding: '0.35rem 0.95rem',
                      whiteSpace: 'nowrap',
                      borderRadius: 'var(--radius-full)',
                      flexShrink: 0,
                    }}
                  >
                    {spec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }}
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by physician name or speciality..."
              aria-label="Search doctors by name or speciality"
              className="form-input"
              style={{
                paddingLeft: '2.75rem',
                minHeight: '48px',
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-md)',
              }}
            />
          </div>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
              gap: '1.5rem',
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <DoctorCardSkeleton key={i} />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No practitioners found"
            description={
              searchTerm || selectedSpeciality !== 'All'
                ? `No doctors matched "${searchTerm || selectedSpeciality}". Try adjusting your filters.`
                : 'No practitioners are currently listed in the directory.'
            }
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
              gap: '1.5rem',
            }}
          >
            {doctors.map((doc, idx) => {
              const avatarColor = doc.avatar_color || getAvatarColor(doc.id);
              const initials = getDoctorInitials(doc.full_name);

              // Next available slot format
              let nextSlotText = 'No slots in the next 14 days';
              let isSlotAvailable = false;
              if (doc.next_available_slot) {
                isSlotAvailable = true;
                const relDate =
                  getRelativeClinicDateLabel(doc.next_available_slot.start_at) ||
                  formatClinicFullDate(doc.next_available_slot.start_at);
                const timeStr = formatClinicTime(doc.next_available_slot.start_at);
                nextSlotText = `Next: ${relDate} at ${timeStr}`;
              }

              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: idx * 0.03 }}
                  className="card card-interactive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Header Row: Initials Avatar + Name & Speciality */}
                    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: avatarColor,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          flexShrink: 0,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                        aria-hidden="true"
                      >
                        {initials}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            marginBottom: '0.2rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {doc.full_name}
                        </h3>
                        <span
                          style={{
                            display: 'inline-block',
                            color: 'var(--color-primary-700)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          {doc.speciality}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Badges: Experience & Languages */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.78rem' }}>
                      {doc.years_of_experience != null && doc.years_of_experience > 0 && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 500,
                          }}
                        >
                          <Award size={13} aria-hidden="true" />
                          <span>{doc.years_of_experience} yrs exp</span>
                        </span>
                      )}

                      {doc.languages && doc.languages.length > 0 && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 500,
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`Languages: ${doc.languages.join(', ')}`}
                        >
                          <Globe size={13} aria-hidden="true" />
                          <span>{doc.languages.slice(0, 2).join(', ')}{doc.languages.length > 2 ? ` +${doc.languages.length - 2}` : ''}</span>
                        </span>
                      )}

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 500,
                        }}
                      >
                        <Clock size={13} aria-hidden="true" />
                        <span>{doc.slot_minutes}m slots</span>
                      </span>
                    </div>

                    {/* Next Available Slot Badge */}
                    <div>
                      {isSlotAvailable ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.35rem 0.65rem',
                            background: 'var(--color-primary-50)',
                            border: '1px solid var(--color-primary-200)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8rem',
                            color: 'var(--color-primary-800)',
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary-600)',
                              display: 'inline-block',
                            }}
                            aria-hidden="true"
                          />
                          <span>{nextSlotText}</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.3rem 0.6rem',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          {nextSlotText}
                        </span>
                      )}
                    </div>

                    {/* Bio snippet */}
                    {doc.bio && (
                      <p
                        style={{
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          color: 'var(--text-secondary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {doc.bio}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Consultation Fee & Action */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        Consultation
                      </span>
                      <span className="mono" style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                        ₹{doc.consultation_fee ? Number(doc.consultation_fee).toFixed(0) : '400'}
                      </span>
                    </div>

                    <Link
                      to={`/doctors/${doc.id}`}
                      style={{ textDecoration: 'none' }}
                      aria-label={`View available slots for ${doc.full_name}`}
                    >
                      <button
                        type="button"
                        className="btn-primary btn-md"
                        style={{ minHeight: '44px', gap: '0.4rem' }}
                      >
                        <span>View Slots</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
