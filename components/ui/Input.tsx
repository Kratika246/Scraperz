'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full rounded-lg border border-slate-300 bg-white
          px-3.5 py-2.5 text-sm text-slate-900
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-150
          disabled:bg-slate-50 disabled:text-slate-500
          ${error ? 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : ''}
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-danger-500 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={`
          w-full rounded-lg border border-slate-300 bg-white
          px-3.5 py-2.5 text-sm text-slate-900
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-150 resize-none
          disabled:bg-slate-50 disabled:text-slate-500
          ${error ? 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : ''}
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-danger-500">{error}</p>
      )}
    </div>
  );
}
