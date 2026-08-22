import React from 'react';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-info-500',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  primary: 'bg-primary-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-info-500',
};

export default function Badge({
  children,
  variant = 'default',
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        text-xs font-medium px-2.5 py-1 rounded-full
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} ${
            variant === 'warning' ? 'animate-pulse-dot' : ''
          }`}
        />
      )}
      {children}
    </span>
  );
}

/** Helper to map common status strings to badge variants */
export function statusToBadgeVariant(
  status: string
): BadgeVariant {
  switch (status) {
    case 'approved':
    case 'ready':
    case 'done':
    case 'published':
      return 'success';
    case 'running':
    case 'scraping':
    case 'pending':
    case 'queued':
      return 'warning';
    case 'rejected':
    case 'failed':
      return 'danger';
    case 'discovered':
    case 'draft':
      return 'info';
    default:
      return 'default';
  }
}
