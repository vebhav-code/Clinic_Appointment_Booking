import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, IndianRupee, ArrowRight, UserCheck } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

const SPECIALITIES = [
  'All',
  'General Physician',
  'Dermatologist',
  'Cardiologist',
  'Pediatrician',
];

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

    const timer = setTimeout(loadDoctors, 250);
    return () => clearTimeout(timer);
  }, [selectedSpeciality, searchTerm]);

  return (
    <div style={{ padding: '2rem 0', minHeight: 'calc(100vh - 64px)' }}>
      {/* Marquee Strip */}
      <div
        style={{
          borderTop: '1px solid var(--border-color)',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--color-black)',
          color: 'var(--color-white)',
          padding: '0.45rem 0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          marginBottom: '2.5rem',
        }}
      >
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
          className="mono"
          style={{ fontSize: '0.75rem', letterSpacing: '0.15em', display: 'inline-block' }}
        >
          PREVENTIVE MEDICINE • CLINICAL DERMATOLOGY • INTERVENTIONAL CARDIOLOGY • NEONATAL PEDIATRICS • EVIDENCE-BASED CARE • ZERO OVERBOOKING GUARANTEE • REAL-TIME AVAILABILITY • ATOMIC SCHEDULING • PREVENTIVE MEDICINE • CLINICAL DERMATOLOGY • INTERVENTIONAL CARDIOLOGY • NEONATAL PEDIATRICS
        </motion.div>
      </div>

      <div className="container">
        {/* Page Heading */}
        <div style={{ marginBottom: '2rem' }}>
          <span className="mono-label">[MEDICAL DIRECTORY]</span>
          <h1 style={{ marginTop: '0.25rem' }}>Select a Practitioner</h1>
          <p style={{ marginTop: '0.4rem', maxWidth: '650px' }}>
            Book direct consultations with verified specialists. Slots are deterministically generated and strictly protected against double-booking.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            padding: '1.25rem',
            marginBottom: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--color-white)',
            boxShadow: '4px 4px 0 0 #000000',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '1rem', color: 'var(--color-black)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by physician name or clinical speciality..."
              className="form-input"
              style={{ paddingLeft: '2.75rem', height: '48px' }}
            />
          </div>

          {/* Speciality Filter Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span className="mono-label" style={{ marginRight: '0.5rem' }}>
              Filter:
            </span>
            {SPECIALITIES.map((spec) => {
              const active = selectedSpeciality === spec;
              return (
                <button
                  key={spec}
                  onClick={() => setSelectedSpeciality(spec)}
                  className={active ? 'btn-primary' : 'btn-outline'}
                  style={{
                    fontSize: '0.8rem',
                    minHeight: '34px',
                    padding: '0.25rem 0.85rem',
                    borderRadius: 'var(--radius-none)',
                  }}
                >
                  {spec}
                </button>
              );
            })}
          </div>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{
                  border: '1px solid var(--color-gray-300)',
                  padding: '1.5rem',
                  height: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background: 'var(--color-gray-50)',
                }}
              >
                <div className="mono" style={{ fontSize: '0.8rem' }}>
                  [LOADING PHYSICIAN PROFILE...]
                </div>
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--border-color)',
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
            }}
          >
            <div className="mono" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              [NO PRACTITIONERS FOUND]
            </div>
            <p>No doctors matched your current search filters. Try clearing filters or search terms.</p>
            <button
              onClick={() => {
                setSelectedSpeciality('All');
                setSearchTerm('');
              }}
              className="btn-outline"
              style={{ marginTop: '1.25rem' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {doctors.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                style={{
                  border: '1px solid var(--border-color)',
                  background: 'var(--color-white)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                }}
                whileHover={{ y: -2, boxShadow: '4px 4px 0 0 #000000' }}
              >
                <div>
                  {/* Speciality Badge & Slot Length */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        background: 'var(--color-black)',
                        color: 'var(--color-white)',
                      }}
                    >
                      {doc.speciality}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Clock size={13} /> {doc.slot_minutes}M SLOTS
                    </span>
                  </div>

                  {/* Doctor Name */}
                  <h3 style={{ fontSize: '1.35rem', marginBottom: '0.35rem' }}>{doc.full_name}</h3>

                  {/* Next Available Slot Chip */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    {doc.next_available_slot ? (
                      <span
                        className="mono"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.2rem 0.6rem',
                          background: 'var(--color-teal-50)',
                          border: '1px solid var(--color-teal-200)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          color: 'var(--color-teal-900)',
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--color-teal-600)',
                            display: 'inline-block',
                          }}
                        />
                        Next: {new Date(doc.next_available_slot.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {doc.next_available_slot.local_start}
                      </span>
                    ) : (
                      <span
                        className="mono"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.5rem',
                          background: 'var(--color-gray-100)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        No slots in next 14 days
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  <p
                    style={{
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {doc.bio || 'General clinical consultation and outpatient care.'}
                  </p>
                </div>

                {/* Footer Details & Action */}
                <div
                  style={{
                    borderTop: '1px solid var(--color-gray-200)',
                    paddingTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span className="mono-label" style={{ display: 'block', fontSize: '0.65rem' }}>
                      CONSULTATION FEE
                    </span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      ₹{doc.consultation_fee ? Number(doc.consultation_fee).toFixed(0) : '400'}
                    </span>
                  </div>

                  <Link to={`/doctors/${doc.id}`} style={{ textDecoration: 'none' }}>
                    <button className="btn-primary" style={{ minHeight: '38px', padding: '0.4rem 0.9rem' }}>
                      <span>View Slots</span>
                      <ArrowRight size={14} />
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
