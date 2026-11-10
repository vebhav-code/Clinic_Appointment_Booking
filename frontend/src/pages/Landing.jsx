import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Bell,
  ArrowRight,
  Search,
  CalendarCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Landing() {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleQuickLogin = async (email, password, targetRoute) => {
    try {
      await login(email, password);
      addToast(`Logged in successfully as ${email}`, 'success');
      navigate(targetRoute);
    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section
        style={{
          padding: '5rem 0 4rem',
          background: 'linear-gradient(180deg, #ffffff 0%, var(--bg-primary) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: '780px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              color: 'var(--color-primary-800)',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--color-primary-600)' }} aria-hidden="true" />
            <span>Zero Double-Booking Guarantee • Clinic Timezone Enforced</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              fontWeight: 800,
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              margin: '0 0 1.25rem',
              letterSpacing: '-0.025em',
            }}
          >
            Clinic Appointments, Engineered with Certainty
          </h1>

          <p
            style={{
              fontSize: '1.15rem',
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              margin: '0 0 2.25rem',
            }}
          >
            Book verified specialists with real-time slot generation, atomic reschedule safety, and database exclusion constraints that eliminate double bookings.
          </p>

          {/* Single Clear CTA */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link
              to="/doctors"
              className="btn-primary"
              style={{
                textDecoration: 'none',
                fontSize: '1.05rem',
                padding: '0.85rem 2.25rem',
                minHeight: '48px',
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <span>Find a Doctor</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3-Step "How It Works" Section */}
      <section style={{ padding: '4.5rem 0', backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3rem' }}>
            <span className="section-label">Seamless Booking</span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0 0.5rem', color: 'var(--text-primary)' }}>
              How PulseClinic Works
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Three straightforward steps to secure your clinical consultation.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            {/* Step 1 */}
            <div className="card" style={{ padding: '2rem 1.75rem', position: 'relative' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Search size={24} aria-hidden="true" />
              </div>
              <span className="section-label">Step 1</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.2rem 0 0.5rem', color: 'var(--text-primary)' }}>
                Find Your Specialist
              </h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Browse qualified doctors filtered by speciality, consultation fee, and next available opening across 14 upcoming days.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card" style={{ padding: '2rem 1.75rem', position: 'relative' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Clock size={24} aria-hidden="true" />
              </div>
              <span className="section-label">Step 2</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.2rem 0 0.5rem', color: 'var(--text-primary)' }}>
                Select Real-Time Slot
              </h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Pick from live Morning, Afternoon, or Evening slots computed in the clinic timezone, automatically accounting for leaves.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card" style={{ padding: '2rem 1.75rem', position: 'relative' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-50)',
                  color: 'var(--color-primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <CalendarCheck size={24} aria-hidden="true" />
              </div>
              <span className="section-label">Step 3</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.2rem 0 0.5rem', color: 'var(--text-primary)' }}>
                Confirmed & Protected
              </h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Instant confirmation with .ics calendar download, automated 1-hour in-app reminders, and free changes up to 2 hours prior.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Demo Credentials Section */}
      <section style={{ padding: '3.5rem 0 4.5rem' }}>
        <div className="container">
          <div
            className="card"
            style={{
              padding: '2rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <span className="section-label">Quick Evaluation</span>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.2rem 0 0.35rem', color: 'var(--text-primary)' }}>
                Try PulseClinic with Demo Accounts
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Click any persona below to sign in instantly and evaluate patient or clinician workflows.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {/* Doctor Card 1 */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  backgroundColor: 'var(--color-slate-50)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-primary-100)',
                      color: 'var(--color-primary-800)',
                    }}
                  >
                    Doctor
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>15m slots</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.15rem' }}>Dr. Arvind Sharma</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 600, margin: '0 0 0.5rem' }}>
                  General Physician
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                  Mon–Sat 09:00–12:30 & 16:30–19:30
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('dr.sharma@clinic.com', 'DemoPassword123!', '/doctor/today')}
                  className="btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  Sign In as Dr. Sharma
                </button>
              </div>

              {/* Doctor Card 2 */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  backgroundColor: 'var(--color-slate-50)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-primary-100)',
                      color: 'var(--color-primary-800)',
                    }}
                  >
                    Doctor
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>30m slots</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.15rem' }}>Dr. Priya Nair</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 600, margin: '0 0 0.5rem' }}>
                  Dermatologist
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                  Mon–Sat 10:00–13:00 & 17:00–20:00
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('dr.nair@clinic.com', 'DemoPassword123!', '/doctor/today')}
                  className="btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  Sign In as Dr. Nair
                </button>
              </div>

              {/* Patient Card 1 */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  backgroundColor: 'var(--color-slate-50)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-slate-200)',
                      color: 'var(--color-slate-800)',
                    }}
                  >
                    Patient
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.15rem' }}>Rohan Verma</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                  rohan.patient@example.com
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                  Upcoming and completed visits to test tabs
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('rohan.patient@example.com', 'DemoPassword123!', '/my-appointments')}
                  className="btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  Sign In as Rohan
                </button>
              </div>

              {/* Patient Card 2 */}
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  backgroundColor: 'var(--color-slate-50)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-slate-200)',
                      color: 'var(--color-slate-800)',
                    }}
                  >
                    Patient
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.15rem' }}>Ananya Iyer</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>
                  ananya.patient@example.com
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                  Active consultations and history
                </p>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ananya.patient@example.com', 'DemoPassword123!', '/my-appointments')}
                  className="btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  Sign In as Ananya
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', backgroundColor: '#ffffff', padding: '1.75rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} PulseClinic • FastAPI + React + PostgreSQL
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
            <Link to="/doctors" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Doctors Directory</Link>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Sign In</Link>
            <Link to="/register" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
