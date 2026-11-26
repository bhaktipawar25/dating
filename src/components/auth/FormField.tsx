"use client";

import React from "react";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  rightAccessory?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  error,
  hint,
  rightAccessory,
  required = false,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5 font-helvetica">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-[11px] font-bold uppercase tracking-[0.11em] text-date2-charcoal"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-rose-600">
              *
            </span>
          )}
        </label>
        {rightAccessory}
      </div>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-bold text-rose-600"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-date2-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
