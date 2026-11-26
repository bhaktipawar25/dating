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
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (disabled) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = SEX_OPTIONS[(index + 1) % SEX_OPTIONS.length];
      onChange(next.id);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev =
        SEX_OPTIONS[(index - 1 + SEX_OPTIONS.length) % SEX_OPTIONS.length];
      onChange(prev.id);
    }
  };

  return (
    <section
      aria-labelledby="sex-section-heading"
      className="space-y-4 font-helvetica"
    >
      <div>
        <h2
          id="sex-section-heading"
          className="text-2xl font-bold tracking-tight text-date2-ink sm:text-[26px]"
        >
          Tell Us About Yourself
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-date2-slate">
          Help us understand you better so we can create a more respectful,
          affirming dating experience.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Select your sex"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {SEX_OPTIONS.map((option, index) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(option.id)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`group flex min-h-[118px] flex-col items-center justify-center gap-2.5 rounded-[18px] border p-4 text-center transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? "border-date2-violet bg-date2-lavenderMist shadow-indigoSoft ring-2 ring-date2-paleLavender"
                  : "border-date2-border bg-date2-white hover:border-date2-lightPeriwinkle hover:bg-date2-canvas"
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                  isSelected
                    ? "bg-date2-midnight text-date2-limeMark"
                    : "bg-date2-lavenderMist text-date2-deepIndigo group-hover:bg-date2-paleLavender"
                }`}
              >
                <SexIcon id={option.id} />
              </span>

              <span
                className={`text-sm font-bold ${
                  isSelected ? "text-date2-midnight" : "text-date2-ink"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-xs font-bold text-rose-600">
          {error}
        </p>
      )}
    </section>
  );
}
