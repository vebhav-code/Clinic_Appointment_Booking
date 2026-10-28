import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Bell,
  UserCheck,
  ArrowRight,
  Sparkles,
  Stethoscope,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Landing() {
  const { isAuthenticated, user, role, login } = useAuth();
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
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '70px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-600)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Stethoscope size={20} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Pulse<span style={{ color: 'var(--color-primary-600)' }}>Clinic</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAuthenticated ? (
              <Link
                to={role === 'doctor' ? '/doctor/today' : '/doctors'}
                className="btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Dashboard ({role}) <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/doctors" className="btn-outline" style={{ textDecoration: 'none' }}>
                  Browse Doctors
                </Link>
                <Link to="/login" className="btn-secondary" style={{ textDecoration: 'none' }}>
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary" style={{ textDecoration: 'none' }}>
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '4rem 0 3.5rem', background: 'linear-gradient(180deg, #ffffff 0%, var(--bg-primary) 100%)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '840px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-200)',
              color: 'var(--color-primary-800)',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            <ShieldCheck size={16} color="var(--color-primary-600)" />
            Zero Double-Booking Guarantee • Real-Time Concurrency Protection
          </div>

          <h1 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
            Clinic Appointments, Engineered for Certainty
          </h1>

          <p style={{ fontSize: '1.15rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '2.25rem' }}>
            Book verified doctors with live slot availability, atomic reschedule guarantees, and guaranteed concurrency
            protection backed by PostgreSQL database exclusion constraints.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/doctors" className="btn-primary" style={{ textDecoration: 'none', fontSize: '1.05rem', padding: '0.75rem 1.75rem' }}>
              Find a Doctor & Book <ArrowRight size={18} />
            </Link>
            <Link to="/register" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '1.05rem', padding: '0.75rem 1.75rem' }}>
              Patient Self-Registration
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Demo Credentials Section */}
      <section style={{ padding: '2.5rem 0 3.5rem' }}>
        <div className="container">
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <span className="mono-label">ONE-CLICK DEMO ACCESS</span>
              <h2 style={{ fontSize: '1.4rem', marginTop: '0.3rem' }}>Try PulseClinic with Seeded Accounts</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Click any persona below to log in instantly and test doctor or patient workflows.
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-booked">DOCTOR</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>15m slots</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Dr. Arvind Sharma</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  General Physician
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Schedule: Mon–Sat 09:00–12:30 & 16:30–19:30
                </p>
                <button
                  onClick={() => handleQuickLogin('dr.sharma@clinic.com', 'DemoPassword123!', '/doctor/today')}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  Login as Dr. Sharma
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-booked">DOCTOR</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>30m slots</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Dr. Priya Nair</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 600, marginBottom: '0.75rem' }}>
                  Dermatologist
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Schedule: Mon–Sat 10:00–13:00 & 17:00–20:00
                </p>
                <button
                  onClick={() => handleQuickLogin('dr.nair@clinic.com', 'DemoPassword123!', '/doctor/today')}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  Login as Dr. Nair
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-completed">PATIENT</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Rohan Verma</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  rohan.patient@example.com
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Has upcoming and completed appointments to test tabs.
                </p>
                <button
                  onClick={() => handleQuickLogin('rohan.patient@example.com', 'DemoPassword123!', '/my-appointments')}
                  className="btn-secondary"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  Login as Rohan (Patient)
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-completed">PATIENT</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active</span>
                </div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.2rem' }}>Ananya Iyer</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  ananya.patient@example.com
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Has scheduled consultations and history.
                </p>
                <button
                  onClick={() => handleQuickLogin('ananya.patient@example.com', 'DemoPassword123!', '/my-appointments')}
                  className="btn-secondary"
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  Login as Ananya (Patient)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Engineering Features */}
      <section style={{ padding: '3rem 0 5rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="mono-label">SYSTEM ARCHITECTURE</span>
            <h2 style={{ marginTop: '0.3rem' }}>Built for Medical-Grade Precision</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-primary-600)' }}>
                <Lock size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>PostgreSQL Exclusion Constraints</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Enforced by PostgreSQL <code className="mono">btree_gist</code> extension with <code className="mono">EXCLUDE USING gist (doctor_id WITH =, tstzrange(start_at, end_at) WITH &&)</code> and a matching patient constraint. Race conditions return 409 Conflict.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-accent-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-accent-600)' }}>
                <Clock size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Pure Slot Generator</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Slots are generated purely on-the-fly from weekday availability windows, slot length (15 or 30 min), leave dates, and active appointments. Trailing partial slots are dropped and past slots are never offered.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-primary-600)' }}>
                <Calendar size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Atomic Reschedule & 2h Cutoff</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Reschedule operations cancel the old and book the new in a single database transaction. If the target slot is taken, the old appointment remains safely booked. Blocked within 2 hours of appointment start.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--color-accent-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-accent-600)' }}>
                <Bell size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>In-App & Email Reminders</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                On-demand in-app reminder bell with unread badge computed within 1 hour of consultation start, plus resilient, idempotent background email reminders via <code className="mono">python -m app.send_reminders</code>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', backgroundColor: '#ffffff', padding: '2rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
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
