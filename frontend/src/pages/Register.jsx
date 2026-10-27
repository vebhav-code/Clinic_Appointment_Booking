import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, AlertCircle } from 'lucide-react';
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'var(--color-white)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          width: '100%',
          maxWidth: '460px',
          margin: '0 auto',
          border: '1px solid var(--border-color)',
          padding: '2.25rem 2rem',
          boxShadow: '6px 6px 0 0 #000000',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem' }}>
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
          </div>
          <h2>Patient Registration</h2>
          <p style={{ marginTop: '0.35rem' }}>
            Create your account to discover doctors, view real-time availability, and book appointments.
          </p>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-black)',
              color: 'var(--color-white)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
            />
            {fieldErrors.email && (
              <span className="field-error-msg">{fieldErrors.email}</span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password-input">
              Password (Min 8 Characters)
            </label>
            <input
              id="password-input"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              className={`form-input ${fieldErrors.password ? 'has-error' : ''}`}
              placeholder="••••••••"
            />
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
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            {submitting ? (
              <span className="mono">[CREATING ACCOUNT...]</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={16} />
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
              color: 'var(--color-black)',
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
