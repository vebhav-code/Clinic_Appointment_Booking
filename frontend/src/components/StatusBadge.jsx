import React from 'react';
import { Calendar, CheckCircle2, UserX, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  booked: {
    label: 'Booked',
    className: 'status-badge-booked',
    icon: Calendar,
  },
  completed: {
    label: 'Completed',
    className: 'status-badge-completed',
    icon: CheckCircle2,
  },
  no_show: {
    label: 'No-Show',
    className: 'status-badge-no_show',
    icon: UserX,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'status-badge-cancelled',
    icon: XCircle,
  },
};

export default function StatusBadge({ status, customLabel, size = 13, style }) {
  const normalized = (status || '').toLowerCase();
  const config = STATUS_CONFIG[normalized] || {
    label: status || 'Unknown',
    className: 'status-badge-booked',
    icon: Calendar,
  };

  const Icon = config.icon;

  return (
    <span
      className={`status-badge ${config.className}`}
      style={style}
      role="status"
      aria-label={`Status: ${customLabel || config.label}`}
    >
      <Icon size={size} aria-hidden="true" />
      <span>{customLabel || config.label}</span>
    </span>
  );
}

