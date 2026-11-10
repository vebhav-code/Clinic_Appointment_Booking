import React from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  children,
  style,
}) {
  return (
    <div className="empty-state" style={style}>
      {Icon && (
        <div className="empty-state-icon" aria-hidden="true">
          <Icon size={24} />
        </div>
      )}
      {title && <h4 className="empty-state-title">{title}</h4>}
      {description && <p className="empty-state-desc">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-primary btn-md"
          style={{ marginTop: '0.5rem' }}
        >
          {ActionIcon && <ActionIcon size={16} aria-hidden="true" />}
          <span>{actionLabel}</span>
        </button>
      )}
      {children}
    </div>
  );
}

