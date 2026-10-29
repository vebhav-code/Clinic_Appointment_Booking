/**
 * API Client for PulseClinic backend with automatic JWT attachment and standard error normalization.
 */
import { API_BASE_URL } from '../config';

export class ApiError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('pulse_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot connect to clinic server. Please check your internet connection or server status.',
    );
  }

  // Parse JSON response body
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // If token expired, clear auth session
    if (response.status === 401) {
      localStorage.removeItem('pulse_auth_token');
      localStorage.removeItem('pulse_auth_user');
      window.dispatchEvent(new Event('pulse_auth_logout'));
    }

    const errorBody = data?.error || {};
    const code = data?.code || errorBody.code || `HTTP_${response.status}`;
    const message = data?.message || errorBody.message || response.statusText || 'An error occurred';
    const fields = data?.fields || errorBody.fields || {};

    throw new ApiError(response.status, code, message, fields);
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    login: (email, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (payload) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => request('/auth/me'),
  },

  // Doctors & Slots (Public to logged in users)
  doctors: {
    list: (params = {}) => {
      const query = new URLSearchParams();
      if (params.speciality) query.append('speciality', params.speciality);
      if (params.search) query.append('search', params.search);
      const qs = query.toString();
      return request(`/doctors${qs ? `?${qs}` : ''}`);
    },
    get: (doctorId) => request(`/doctors/${doctorId}`),
    getSlots: (doctorId, dateStr) => request(`/doctors/${doctorId}/slots?date=${dateStr}`),
  },

  // Patient Appointments
  appointments: {
    list: (scope = 'upcoming') => request(`/appointments?scope=${scope}`),
    upcoming: () => request('/appointments/upcoming'),
    past: () => request('/appointments/past'),
    book: (doctorId, startAt, reason) =>
      request('/appointments', {
        method: 'POST',
        body: JSON.stringify({ doctor_id: doctorId, start_at: startAt, reason }),
      }),
    cancel: (appointmentId) =>
      request(`/appointments/${appointmentId}/cancel`, {
        method: 'POST',
      }),
    reschedule: (appointmentId, newStartAt, reason) =>
      request(`/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ new_start_at: newStartAt, reason }),
      }),
  },

  // Doctor Management (Doctor only)
  doctor: {
    getAvailability: () => request('/doctor/availability'),
    updateAvailability: (payload) =>
      request('/doctor/availability', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    getLeaves: () => request('/doctor/leaves'),
    blockLeave: (date, reason) =>
      request('/doctor/leaves', {
        method: 'POST',
        body: JSON.stringify({ date, reason }),
      }),
    unblockLeave: (dateStr) =>
      request(`/doctor/leaves?date=${dateStr}`, {
        method: 'DELETE',
      }),
    getTodayAppointments: () => request('/doctor/appointments/today'),
    getAppointmentsByDate: (dateStr) => request(`/doctor/appointments?date=${dateStr}`),
    updateStatus: (appointmentId, status) =>
      request(`/doctor/appointments/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // In-app Reminders
  reminders: {
    get: () => request('/reminders'),
    markRead: (reminderId) =>
      request(`/reminders/${reminderId}/read`, {
        method: 'POST',
      }),
  },
};
