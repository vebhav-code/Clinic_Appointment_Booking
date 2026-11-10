import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Calendar,
  Clock,
  LogOut,
  User,
  Users,
  CalendarCheck,
  CalendarOff,
  Sliders,
  Home,
  LogIn,
  UserPlus,
  Check,
  CheckCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const {
    reminders,
    unreadCount,
    isReminderOpen,
    setIsReminderOpen,
    markReminderRead,
    markAllRemindersRead,
  } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const reminderDropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPatient = role === 'patient';
  const isDoctor = role === 'doctor';

  // Desktop navigation items
  const patientDesktopLinks = [
    { label: 'Find Doctors', path: '/doctors' },
    { label: 'My Appointments', path: '/my-appointments' },
  ];

  const doctorDesktopLinks = [
    { label: "Today's Schedule", path: '/doctor/today' },
    { label: 'Availability', path: '/doctor/availability' },
    { label: 'Leaves', path: '/doctor/leaves' },
    { label: 'Schedule by Date', path: '/doctor/schedule' },
  ];

  const guestDesktopLinks = [
    { label: 'Home', path: '/' },
    { label: 'Find Doctors', path: '/doctors' },
  ];

  const desktopLinks = isPatient
    ? patientDesktopLinks
    : isDoctor
    ? doctorDesktopLinks
    : guestDesktopLinks;

  // Mobile bottom tab bar items
  const patientMobileTabs = [
    { label: 'Doctors', path: '/doctors', icon: Users },
    { label: 'Appointments', path: '/my-appointments', icon: CalendarCheck },
  ];

  const doctorMobileTabs = [
    { label: 'Today', path: '/doctor/today', icon: Calendar },
    { label: 'Schedule', path: '/doctor/schedule', icon: Clock },
    { label: 'Availability', path: '/doctor/availability', icon: Sliders },
    { label: 'Leaves', path: '/doctor/leaves', icon: CalendarOff },
  ];

  const guestMobileTabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Doctors', path: '/doctors', icon: Users },
    { label: 'Sign In', path: '/login', icon: LogIn },
    { label: 'Register', path: '/register', icon: UserPlus },
  ];

  const mobileTabs = isPatient
    ? patientMobileTabs
    : isDoctor
    ? doctorMobileTabs
    : guestMobileTabs;

  // Close reminder dropdown on Escape key
  useEffect(() => {
    if (!isReminderOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsReminderOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReminderOpen, setIsReminderOpen]);

  // Close reminder dropdown on Click-outside
  useEffect(() => {
    if (!isReminderOpen) return;
    const handleClickOutside = (e) => {
      if (
        reminderDropdownRef.current &&
        !reminderDropdownRef.current.contains(e.target)
      ) {
        setIsReminderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isReminderOpen, setIsReminderOpen]);

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: 'var(--shadow-sm)',
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
            to={user ? (isDoctor ? '/doctor/today' : '/my-appointments') : '/'}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: '1.3rem',
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
              }}
            >
              Pulse
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '0.15rem 0.45rem',
                backgroundColor: 'var(--color-primary-50)',
                color: 'var(--color-primary-700)',
                border: '1px solid var(--color-primary-200)',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Clinic
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'none',
              gap: '1.75rem',
              alignItems: 'center',
            }}
            className="desktop-nav"
            role="navigation"
            aria-label="Main Navigation"
          >
            {desktopLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    textDecoration: 'none',
                    color: active ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 500,
                    fontSize: '0.925rem',
                    position: 'relative',
                    padding: '0.5rem 0',
                    transition: 'color var(--transition-fast)',
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
                        backgroundColor: 'var(--color-primary-600)',
                        borderRadius: '1px',
                      }}
                      transition={{ duration: 0.18 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar: Reminder Bell + User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} ref={reminderDropdownRef}>
            {user ? (
              <>
                {/* Reminder Bell Button */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsReminderOpen((prev) => !prev)}
                    aria-label={`In-app notifications (${unreadCount} unread)`}
                    className="btn-ghost"
                    style={{
                      minHeight: '44px',
                      minWidth: '44px',
                      padding: 0,
                      borderRadius: 'var(--radius-full)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Bell size={20} aria-hidden="true" />
                    {unreadCount > 0 && (
                      <span
                        className="mono"
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          height: '18px',
                          minWidth: '18px',
                          padding: '0 4px',
                          borderRadius: 'var(--radius-full)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px solid #ffffff',
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Desktop Dropdown & Mobile Bottom Sheet */}
                  <AnimatePresence>
                    {isReminderOpen && (
                      <>
                        {/* Mobile Backdrop overlay */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="reminder-backdrop-mobile"
                          onClick={() => setIsReminderOpen(false)}
                          aria-hidden="true"
                        />

                        {/* Reminder Container */}
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="reminder-panel"
                        >
                          {/* Panel Header */}
                          <div
                            style={{
                              padding: '0.85rem 1rem',
                              borderBottom: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--color-slate-50)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                Notifications
                              </span>
                              {unreadCount > 0 && (
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    backgroundColor: 'var(--color-primary-100)',
                                    color: 'var(--color-primary-800)',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: 'var(--radius-full)',
                                  }}
                                >
                                  {unreadCount}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {reminders.length > 0 && (
                                <button
                                  type="button"
                                  onClick={markAllRemindersRead}
                                  className="btn-ghost btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--color-primary-700)' }}
                                  title="Mark all notifications as read"
                                >
                                  <CheckCheck size={14} aria-hidden="true" />
                                  <span>Mark all read</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsReminderOpen(false)}
                                className="btn-ghost btn-sm"
                                aria-label="Close notifications panel"
                                style={{ padding: '0.25rem', minHeight: 'auto' }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Reminders List */}
                          <div style={{ overflowY: 'auto', maxHeight: '340px', padding: '0.5rem' }}>
                            {reminders.length === 0 ? (
                              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Bell size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4, display: 'block' }} aria-hidden="true" />
                                <span style={{ fontSize: '0.85rem' }}>No new reminders</span>
                              </div>
                            ) : (
                              reminders.map((r) => (
                                <div
                                  key={r.id}
                                  style={{
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-sm)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.25rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                      {r.title}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => markReminderRead(r.id)}
                                      className="btn-ghost btn-sm"
                                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--text-muted)' }}
                                      title="Dismiss reminder"
                                    >
                                      Dismiss
                                    </button>
                                  </div>
                                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                    {r.message}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* User Info Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-slate-50)',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user?.full_name?.split(' ')[0]}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '0.1rem 0.35rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: isDoctor ? 'var(--color-primary-100)' : 'var(--color-slate-200)',
                      color: isDoctor ? 'var(--color-primary-800)' : 'var(--color-slate-700)',
                    }}
                  >
                    {role}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="btn-ghost"
                  style={{
                    minHeight: '44px',
                    minWidth: '44px',
                    padding: 0,
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <LogOut size={18} aria-hidden="true" />
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Link
                  to="/login"
                  className="btn-ghost btn-sm"
                  style={{ fontSize: '0.875rem' }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary btn-sm"
                  style={{ fontSize: '0.875rem' }}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (< 768px) */}
      <nav
        className="mobile-bottom-tabs"
        role="navigation"
        aria-label="Mobile Navigation Bar"
      >
        {mobileTabs.map((tab) => {
          const active = location.pathname === tab.path;
          const TabIcon = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`mobile-tab-item ${active ? 'active' : ''}`}
            >
              <TabIcon size={20} aria-hidden="true" />
              <span className="mobile-tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Navigation responsive styles */}
      <style>{`
        /* Desktop navigation display */
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-bottom-tabs {
            display: none !important;
          }
          .reminder-panel {
            position: absolute;
            right: 0;
            top: 52px;
            width: 350px;
            background: #ffffff;
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-modal);
            z-index: 250;
            overflow: hidden;
          }
          .reminder-backdrop-mobile {
            display: none !important;
          }
        }

        /* Mobile layout (< 768px) */
        @media (max-width: 767px) {
          body {
            padding-bottom: 64px; /* Offset for mobile bottom tab bar */
          }
          .mobile-bottom-tabs {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: #ffffff;
            border-top: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-around;
            z-index: 200;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .mobile-tab-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: var(--text-muted);
            min-height: 48px;
            padding: 4px 0;
            transition: color var(--transition-fast);
            gap: 2px;
          }
          .mobile-tab-item.active {
            color: var(--color-primary-600);
            font-weight: 600;
          }
          .mobile-tab-label {
            font-size: 0.7rem;
            letter-spacing: -0.01em;
          }
          .reminder-backdrop-mobile {
            position: fixed;
            inset: 0;
            background-color: rgba(15, 23, 42, 0.5);
            z-index: 300;
          }
          .reminder-panel {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            background: #ffffff;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
            box-shadow: var(--shadow-modal);
            z-index: 310;
            max-height: 80vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
