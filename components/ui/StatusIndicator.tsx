'use client';

import React from 'react';

type StatusType = 'idle' | 'running' | 'success' | 'error';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { color: string; bg: string; animate: boolean }
> = {
  idle: { color: 'bg-slate-400', bg: 'bg-slate-100', animate: false },
  running: { color: 'bg-warning-500', bg: 'bg-warning-50', animate: true },
  success: { color: 'bg-success-500', bg: 'bg-success-50', animate: false },
  error: { color: 'bg-danger-500', bg: 'bg-danger-50', animate: false },
};

export default function StatusIndicator({
  status,
  label,
  className = '',
}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {status === 'running' ? (
        <svg
          className="animate-spin h-4 w-4 text-warning-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : (
        <span
          className={`w-2 h-2 rounded-full ${config.color} ${
            config.animate ? 'animate-pulse-dot' : ''
          }`}
        />
      )}
      {label && (
        <span className="text-sm text-slate-600">{label}</span>
      )}
    </div>
  );
}

/** Skeleton loading placeholder */
export function Skeleton({
  className = '',
  width,
  height,
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`animate-shimmer rounded-md ${className}`}
      style={{ width, height }}
    />
  );
}
