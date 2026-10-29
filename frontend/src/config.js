/**
 * Central API & Application Configuration
 * Reads backend base URL from VITE_API_URL (Vite environment variable).
 * Values are provided by .env.development for local dev or .env.production / Vercel for production.
 */

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const trimmedApiUrl = rawApiUrl.replace(/\/+$/, '');

// Base URL for all API requests (guarantees normalized /api/v1 endpoint)
export const API_BASE_URL = trimmedApiUrl
  ? (trimmedApiUrl.endsWith('/api/v1') ? trimmedApiUrl : `${trimmedApiUrl}/api/v1`)
  : '/api/v1';

export const API_URL = API_BASE_URL;

// Base backend URL without /api/v1 (useful for health check or root server links)
export const BACKEND_URL = trimmedApiUrl.endsWith('/api/v1')
  ? trimmedApiUrl.slice(0, -'/api/v1'.length)
  : trimmedApiUrl;

export const CLINIC_TIMEZONE = import.meta.env.VITE_CLINIC_TZ || 'Asia/Kolkata';

export default {
  API_BASE_URL,
  API_URL,
  BACKEND_URL,
  CLINIC_TIMEZONE,
};
