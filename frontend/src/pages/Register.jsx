import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserPlus,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../api/client';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');

    // Client-side quick check
    if (formData.password.length < 8) {
      setFieldErrors({ password: 'Password must be at least 8 characters long.' });
      return;
    }

    setSubmitting(true);

    try {
      const user = await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || null,
      });
      addToast(`Account created! Welcome, ${user.full_name}.`, 'success');
      navigate('/doctors', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields && Object.keys(err.fields).length > 0) {
          setFieldErrors(err.fields);
        }
        setGeneralError(err.message);
      } else {
        setGeneralError('Registration failed. Please check your inputs.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        backgroundColor: 'var(--color-slate-50)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          margin: '0 auto',
          padding: '2.25rem 2rem',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
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
              }}
            >
              Clinic
            </span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
            Patient Registration
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Create an account to book consultations and manage clinic visits.
          </p>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="name-input">
              Full Legal Name
            </label>
            <input
              id="name-input"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              value={formData.full_name}
              onChange={handleChange}
              className={`form-input ${fieldErrors.full_name ? 'has-error' : ''}`}
              placeholder="e.g. Maya Krishnan"
              style={{ minHeight: '44px' }}
            />
            {fieldErrors.full_name && (
              <span className="field-error-msg">{fieldErrors.full_name}</span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">
              Email Address
            </label>
            <input
              id="email-input"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${fieldErrors.email ? 'has-error' : ''}`}
              placeholder="e.g. maya@example.com"
              style={{ minHeight: '44px' }}
            />
            {fieldErrors.email && (
              <span className="field-error-msg">{fieldErrors.email}</span>
            )}
          </div>

          {/* Password with Show/Hide toggle */}
          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password (Min 8 Characters)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
                placeholder="••••••••"
                style={{ minHeight: '44px', paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '44px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="field-error-msg">{fieldErrors.password}</span>
            )}
          </div>

          {/* Phone (Optional) */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone-input">
              Phone Number <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
            </label>
            <input
              id="phone-input"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              className={`form-input ${fieldErrors.phone ? 'has-error' : ''}`}
              placeholder="+91 98765 43210"
              style={{ minHeight: '44px' }}
            />
            {fieldErrors.phone && (
              <span className="field-error-msg">{fieldErrors.phone}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ width: '100%', minHeight: '44px', marginTop: '0.35rem' }}
          >
            {submitting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span>Creating Account...</span>
              </div>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={16} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div
          style={{
            marginTop: '1.75rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--color-primary-700)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
