/**
 * Clinic timezone-aware date and time formatting utilities using Intl.DateTimeFormat.
 * Adheres strictly to correctness rule #4: Never use toISOString().split('T')[0].
 */

export const CLINIC_TIMEZONE = import.meta.env.VITE_CLINIC_TZ || 'Asia/Kolkata';

// Formatter for YYYY-MM-DD in clinic timezone
const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Human readable full date formatter (e.g., "Monday, Nov 10, 2026")
const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIMEZONE,
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

// Human readable time formatter (e.g., "10:30 AM")
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

// Day and month chip formatter (e.g., "Nov 10", "Mon")
const chipDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIMEZONE,
  month: 'short',
  day: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIMEZONE,
  weekday: 'short',
});

/**
 * Returns a date object or string formatted as YYYY-MM-DD in the clinic timezone.
 * @param {Date | string | number} [dateInput=new Date()]
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatToClinicDate(dateInput = new Date()) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return ymdFormatter.format(d);
}

/**
 * Returns today's date string in YYYY-MM-DD in the clinic timezone.
 * @returns {string}
 */
export function getTodayClinicDate() {
  return ymdFormatter.format(new Date());
}

/**
 * Add days to a given date while keeping clinic timezone context.
 * @param {Date | string} dateInput
 * @param {number} days
 * @returns {string} YYYY-MM-DD in clinic timezone
 */
export function addDaysInClinicTimezone(dateInput, days) {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  d.setDate(d.getDate() + days);
  return ymdFormatter.format(d);
}

/**
 * Returns a human-friendly formatted time string in clinic timezone (e.g., "10:30 AM").
 * @param {Date | string} dateInput
 * @returns {string}
 */
export function formatClinicTime(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return timeFormatter.format(d);
}

/**
 * Returns a human-friendly formatted date string in clinic timezone (e.g., "Tue, Nov 10, 2026").
 * @param {Date | string} dateInput
 * @returns {string}
 */
export function formatClinicFullDate(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return fullDateFormatter.format(d);
}

/**
 * Returns chip date parts { weekday: "Mon", date: "Nov 10", ymd: "2026-11-10" }.
 * @param {Date | string} dateInput
 * @returns {{ weekday: string, date: string, ymd: string }}
 */
export function getClinicDateChipParts(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return {
    weekday: weekdayFormatter.format(d),
    date: chipDateFormatter.format(d),
    ymd: ymdFormatter.format(d),
  };
}

/**
 * Calculates remaining hours and minutes until appointment start from now.
 * @param {string | Date} startAt
 * @returns {{ canModify: boolean, hoursRemaining: number, label: string }}
 */
export function checkCutoffRule(startAt, cutoffHours = 2) {
  const startMs = new Date(startAt).getTime();
  const nowMs = Date.now();
  const diffHours = (startMs - nowMs) / (1000 * 60 * 60);
  const canModify = diffHours > cutoffHours;
  return {
    canModify,
    hoursRemaining: Math.max(0, diffHours),
    label: canModify
      ? `${diffHours.toFixed(1)} hours away`
      : `Within ${cutoffHours}-hour lock window`,
  };
}
