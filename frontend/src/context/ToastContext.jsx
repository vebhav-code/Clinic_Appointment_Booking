import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const ToastContext = createContext(null);

function ToastItem({ toast, onRemove }) {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (toast.duration <= 0 || isPaused) return;
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, isPaused, onRemove]);

  let Icon = Info;
  let iconColor = '#0284c7';
  let borderClass = 'toast-info';

  if (toast.type === 'success') {
    Icon = CheckCircle2;
    iconColor = 'var(--color-primary-600)';
    borderClass = 'toast-success';
  } else if (toast.type === 'error' || toast.type === 'danger') {
    Icon = AlertCircle;
    iconColor = '#ef4444';
    borderClass = 'toast-error';
  } else if (toast.type === 'warning') {
    Icon = AlertTriangle;
    iconColor = '#f59e0b';
    borderClass = 'toast-warning';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ duration: 0.18 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`toast ${borderClass}`}
      role="alert"
    >
      <Icon size={18} style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
      <span style={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.4, flex: 1, color: 'var(--text-primary)' }}>
        {toast.message}
      </span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          padding: '0.2rem',
          minHeight: 'auto',
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  // Helper to trigger transient toast
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Poll in-app reminders every 60 seconds when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setReminders([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    async function fetchReminders() {
      try {
        const data = await api.reminders.get();
        if (isMounted) {
          // If new unread reminders appeared that weren't in state, show toast (no emoji)
          const prevIds = new Set(reminders.map((r) => r.id));
          data.reminders.forEach((r) => {
            if (!prevIds.has(r.id)) {
              addToast(`Reminder: ${r.title} — ${r.message}`, 'info', 6000);
            }
          });
          setReminders(data.reminders || []);
          setUnreadCount(data.unread_count || 0);
        }
      } catch {
        // Silent fail on background poll
      }
    }

    fetchReminders();
    const interval = setInterval(fetchReminders, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, addToast]);

  const markReminderRead = async (id) => {
    try {
      await api.reminders.markRead(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      addToast(err.message || 'Failed to mark reminder as read', 'error');
    }
  };

  const markAllRemindersRead = async () => {
    try {
      await Promise.all(reminders.map((r) => api.reminders.markRead(r.id)));
      setReminders([]);
      setUnreadCount(0);
      addToast('All reminders marked as read', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to mark all as read', 'error');
    }
  };

  return (
    <ToastContext.Provider
      value={{
        addToast,
        reminders,
        unreadCount,
        isReminderOpen,
        setIsReminderOpen,
        markReminderRead,
        markAllRemindersRead,
      }}
    >
      {children}

      {/* Floating Toasts Stack with accessible live region */}
      <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
