import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div className="mono" style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        404
      </div>
      <h2 style={{ marginBottom: '0.75rem' }}>Page Not Found</h2>
      <p style={{ maxWidth: '420px', marginBottom: '2rem' }}>
        The requested clinical resource or endpoint does not exist.
      </p>
      <Link to="/">
        <button className="btn-primary">
          <ArrowLeft size={16} /> Return to Portal Home
        </button>
      </Link>
    </div>
  );
}
