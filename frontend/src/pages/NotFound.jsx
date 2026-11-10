import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
        backgroundColor: 'var(--color-slate-50)',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-primary-50)',
            color: 'var(--color-primary-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileQuestion size={32} aria-hidden="true" />
        </div>

        <div>
          <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary-700)' }}>
            404 Error
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0.25rem 0 0.5rem', color: 'var(--text-primary)' }}>
            Page Not Found
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', margin: 0, lineHeight: 1.5 }}>
            The clinical resource or page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link to="/" style={{ textDecoration: 'none', width: '100%', maxWidth: '240px' }}>
          <button className="btn-primary" style={{ width: '100%', minHeight: '44px' }}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Back to Home</span>
          </button>
        </Link>
      </div>
    </div>
  );
}
