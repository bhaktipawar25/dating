"use client";

import React from "react";
import {
  DISCOVERY_PREFERENCE_OPTIONS,
  type DiscoveryPreferenceId,
} from "@/lib/profile/personalInfoConfig";

interface DiscoveryPreferencesSectionProps {
  selected: DiscoveryPreferenceId[];
  onChange: (next: DiscoveryPreferenceId[]) => void;
  error?: string | null;
  disabled?: boolean;
}

export function DiscoveryPreferencesSection({
  selected,
  onChange,
  error,
  disabled = false,
}: DiscoveryPreferencesSectionProps) {
  const togglePreference = (id: DiscoveryPreferenceId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <section
      aria-labelledby="discovery-preferences-heading"
      className="space-y-3.5 font-helvetica"
    >
      <div>
        <h3
          id="discovery-preferences-heading"
          className="text-base font-bold text-date2-ink"
        >
          Interested In
        </h3>
        <p className="mt-0.5 text-xs leading-relaxed text-date2-slate">
          Choose who you would like to discover on Date². You can select
          multiple options.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {DISCOVERY_PREFERENCE_OPTIONS.map((option) => {
          const isChecked = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-[16px] border p-4 transition-all duration-150 ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              } ${
                isChecked
                  ? "border-date2-violet bg-date2-lavenderMist/80 shadow-sm"
                  : "border-date2-border bg-date2-white hover:border-date2-lightPeriwinkle hover:bg-date2-canvas"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={disabled}
                onChange={() => togglePreference(option.id)}
                className="mt-0.5 h-4 w-4 rounded border-date2-softBorder text-date2-midnight accent-date2-midnight focus:ring-date2-violet"
              />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-date2-ink">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-date2-slate">
                  {option.description}
                </span>
              </span>
            </label>
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
