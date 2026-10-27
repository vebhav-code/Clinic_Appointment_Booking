import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  // Helper to trigger transient toast
  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
          // If new unread reminders appeared that weren't in state, show toast
          const prevIds = new Set(reminders.map((r) => r.id));
          data.reminders.forEach((r) => {
            if (!prevIds.has(r.id)) {
              addToast(`🔔 ${r.title}: ${r.message}`, 'info', 6000);
            }
          });
          setReminders(data.reminders);
          setUnreadCount(data.unread_count);
        }
      } catch {
        // Silent fail on background poll
      }
    }

    fetchReminders();
    const interval = setInterval(fetchReminders, 60000); // 60s polling
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const markReminderRead = async (id) => {
    try {
      await api.reminders.markRead(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      addToast(err.message || 'Failed to mark reminder as read', 'error');
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
      }}
    >
      {children}

      {/* Floating Toasts Stack */}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '380px',
          width: 'calc(100vw - 2rem)',
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
              style={{
                pointerEvents: 'auto',
                background: toast.type === 'error' ? '#000000' : '#ffffff',
                color: toast.type === 'error' ? '#ffffff' : '#000000',
                border: '1px solid #000000',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '0.75rem',
                boxShadow: '0 4px 0 0 #000000',
              }}
            >
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {toast.type === 'error' ? (
                  <AlertCircle size={18} strokeWidth={2.5} style={{ color: '#ffffff', flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={18} strokeWidth={2.5} style={{ color: '#000000', flexShrink: 0 }} />
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.35 }}>
                  {toast.message}
                </span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  padding: 0,
                  minHeight: 'auto',
                  cursor: 'pointer',
                  opacity: 0.7,
                }}
              >
                <X size={16} />
              </button>
            </motion.div>
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
