import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="mono"
            style={{
              fontSize: '0.85rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              animation: 'pulse 1.2s infinite',
            }}
          >
            [LOADING SESSION...]
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to respective home dashboard based on role
    return <Navigate to={role === 'doctor' ? '/doctor/today' : '/doctors'} replace />;
  }

  return children;
}
