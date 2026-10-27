import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, Clock, LogOut, User, UserCheck, Shield, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { reminders, unreadCount, isReminderOpen, setIsReminderOpen, markReminderRead } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPatient = role === 'patient';
  const isDoctor = role === 'doctor';

  const patientLinks = [
    { label: 'Find Doctors', path: '/doctors' },
    { label: 'My Appointments', path: '/my-appointments' },
  ];

  const doctorLinks = [
    { label: "Today's Schedule", path: '/doctor/today' },
    { label: 'Weekly Availability', path: '/doctor/availability' },
    { label: 'Leaves', path: '/doctor/leaves' },
    { label: 'Schedule by Date', path: '/doctor/schedule' },
  ];

  const links = isPatient ? patientLinks : isDoctor ? doctorLinks : [];

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--color-white)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          {/* Brand Logo */}
          <Link
            to={isDoctor ? '/doctor/today' : '/doctors'}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.04em',
              }}
            >
              PULSE
            </span>
            <span
              className="mono"
              style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.4rem',
                background: 'var(--color-black)',
                color: 'var(--color-white)',
                fontWeight: 600,
              }}
            >
              CLINIC
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'none',
              gap: '1.5rem',
              alignItems: 'center',
            }}
            className="desktop-nav"
          >
            {links.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    textDecoration: 'none',
                    color: active ? 'var(--color-black)' : 'var(--text-secondary)',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.9rem',
                    position: 'relative',
                    padding: '0.4rem 0',
                  }}
                >
                  {link.label}
                  {active && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: 'var(--color-black)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Reminder Bell Button */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsReminderOpen((prev) => !prev)}
                aria-label="View in-app notifications"
                style={{
                  minHeight: '40px',
                  height: '40px',
                  width: '40px',
                  padding: 0,
                  borderRadius: 'var(--radius-sm)',
                  position: 'relative',
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    className="mono"
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: 'var(--color-black)',
                      color: 'var(--color-white)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      height: '18px',
                      minWidth: '18px',
                      padding: '0 3px',
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--color-white)',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Reminders Dropdown Popup */}
              <AnimatePresence>
                {isReminderOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '48px',
                      width: '320px',
                      background: 'var(--color-white)',
                      border: '1px solid var(--color-black)',
                      boxShadow: '4px 4px 0 0 #000000',
                      zIndex: 200,
                      maxHeight: '400px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--color-black)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span className="mono-label" style={{ fontWeight: 700, color: 'var(--color-black)' }}>
                        Notifications ({unreadCount})
                      </span>
                      <button
                        onClick={() => setIsReminderOpen(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          minHeight: 'auto',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ overflowY: 'auto', padding: '0.5rem' }}>
                      {reminders.length === 0 ? (
                        <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <span className="mono" style={{ fontSize: '0.8rem' }}>No due reminders</span>
                        </div>
                      ) : (
                        reminders.map((r) => (
                          <div
                            key={r.id}
                            style={{
                              padding: '0.75rem',
                              borderBottom: '1px solid var(--color-gray-200)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.title}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.message}</span>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                              <button
                                onClick={() => markReminderRead(r.id)}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.5rem',
                                  minHeight: '26px',
                                }}
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                border: '1px solid var(--border-color)',
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                {user?.full_name?.split(' ')[0]}
              </span>
              <span
                className="status-badge"
                style={{
                  padding: '0.1rem 0.35rem',
                  fontSize: '0.65rem',
                  background: isDoctor ? 'var(--color-black)' : 'var(--color-gray-100)',
                  color: isDoctor ? 'var(--color-white)' : 'var(--color-black)',
                }}
              >
                {role}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              style={{
                minHeight: '40px',
                height: '40px',
                width: '40px',
                padding: 0,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Phones < 640px) */}
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--color-white)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          zIndex: 100,
          height: '60px',
        }}
      >
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: active ? 'var(--color-black)' : 'var(--text-muted)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.75rem',
                background: active ? 'var(--color-gray-50)' : 'transparent',
                borderRight: '1px solid var(--color-gray-200)',
              }}
            >
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }} className="mono">
                {link.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Responsive media query helper injected via style tag */}
      <style>{`
        @media (min-width: 641px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-bottom-nav {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          body {
            padding-bottom: 70px; /* offset for bottom nav */
          }
        }
      `}</style>
    </>
  );
}
