"use client";

import React from "react";
import { SEX_OPTIONS, type SexOptionId } from "@/lib/profile/personalInfoConfig";

interface SexSelectionSectionProps {
  value: SexOptionId | null;
  onChange: (next: SexOptionId) => void;
  error?: string | null;
  disabled?: boolean;
}

function SexIcon({ id }: { id: SexOptionId }) {
  switch (id) {
    case "MALE":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <circle cx="10" cy="14" r="5" />
          <path d="M19 5l-5.4 5.4M15 5h4v4" />
        </svg>
      );
    case "FEMALE":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <circle cx="12" cy="9" r="5" />
          <path d="M12 14v7M9 18h6" />
        </svg>
      );
    case "TRANS":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <circle cx="12" cy="12" r="4.5" />
          <path d="M15.2 8.8L20 4M16 4h4v4M8.8 8.8L4 4M4 8V4h4M12 16.5V21M9.5 19h5" />
        </svg>
      );
    case "OTHERS":
    default:
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21" />
        </svg>
      );
  }
}

export function SexSelectionSection({
  value,
  onChange,
  error,
  disabled = false,
}: SexSelectionSectionProps) {
  return (
    <section aria-labelledby="sex-section-heading" className="space-y-4">
      <div>
        <h2
          id="sex-section-heading"
          className="text-xl font-bold tracking-tight text-brand-ink sm:text-2xl"
        >
          Tell Us About Yourself
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-brand-muted">
          Help us understand you better so we can create a more meaningful
          dating experience.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Select your sex"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {SEX_OPTIONS.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={`group flex min-h-[116px] flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-center transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? "border-brand-forest bg-brand-ice shadow-soft ring-2 ring-brand-mint/40"
                  : "border-brand-border bg-white hover:border-brand-mint hover:bg-brand-canvas"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                  isSelected
                    ? "bg-brand-forest text-white"
                    : "bg-brand-ice text-brand-forest group-hover:bg-brand-frost"
                }`}
              >
                <SexIcon id={option.id} />
              </span>

              <span className="text-sm font-semibold text-brand-ink">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </section>
  );
}
