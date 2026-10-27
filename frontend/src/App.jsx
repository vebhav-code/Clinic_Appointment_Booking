import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import DoctorsList from './pages/DoctorsList';
import DoctorDetail from './pages/DoctorDetail';
import MyAppointments from './pages/MyAppointments';
import DoctorToday from './pages/doctor/DoctorToday';
import DoctorAvailability from './pages/doctor/DoctorAvailability';
import DoctorLeaves from './pages/doctor/DoctorLeaves';
import DoctorScheduleByDate from './pages/doctor/DoctorScheduleByDate';
import NotFound from './pages/NotFound';

// App Layout that displays Navbar when user is authenticated
function AppLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {isAuthenticated && <Navbar />}
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root Redirect based on authentication & role */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RootRedirect />
              </ProtectedRoute>
            }
          />

          {/* Patient Routes */}
          <Route
            path="/doctors"
            element={
              <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                <DoctorsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctors/:id"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <DoctorDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />

          {/* Doctor Routes */}
          <Route
            path="/doctor/today"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorToday />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/availability"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorAvailability />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/leaves"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorLeaves />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/schedule"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorScheduleByDate />
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function RootRedirect() {
  const { role } = useAuth();
  if (role === 'doctor') {
    return <Navigate to="/doctor/today" replace />;
  }
  return <Navigate to="/doctors" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
