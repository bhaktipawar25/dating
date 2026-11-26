"use client";

import React from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import {
  PROFILE_VISIBILITY_OPTIONS,
  type ProfileVisibilitySettings,
} from "@/lib/profile/personalInfoConfig";

interface ProfileVisibilitySectionProps {
  value: ProfileVisibilitySettings;
  onChange: (next: ProfileVisibilitySettings) => void;
  onSaveChanges: () => void;
  isSaving?: boolean;
  saveStatus?: { variant: "success" | "error"; message: string } | null;
  disabled?: boolean;
}

export function ProfileVisibilitySection({
  value,
  onChange,
  onSaveChanges,
  isSaving = false,
  saveStatus = null,
  disabled = false,
}: ProfileVisibilitySectionProps) {
  const toggleSetting = (key: keyof ProfileVisibilitySettings) => {
    onChange({
      ...value,
      [key]: !value[key],
    });
  };

  return (
    <section
      aria-labelledby="profile-visibility-heading"
      className="space-y-3 rounded-2xl border border-brand-border bg-brand-ice/45 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            id="profile-visibility-heading"
            className="text-base font-bold text-brand-ink"
          >
            Profile Visibility
          </h3>
          <p className="mt-0.5 text-xs text-brand-muted">
            Control what appears on your Date² profile and who can discover you.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || isSaving}
          onClick={onSaveChanges}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-semibold text-brand-forest shadow-sm transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {saveStatus && (
        <StatusBanner
          variant={saveStatus.variant}
          message={saveStatus.message}
        />
      )}

      <div className="space-y-2.5">
        {PROFILE_VISIBILITY_OPTIONS.map((setting) => {
          const enabled = value[setting.key];
          return (
            <div
              key={setting.key}
              className={`flex items-center justify-between gap-4 rounded-xl border p-3.5 transition-colors ${
                enabled
                  ? "border-brand-mint/70 bg-white"
                  : "border-brand-border/80 bg-brand-canvas/80"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-ink">
                  {setting.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-brand-muted">
                  {setting.description}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={setting.label}
                disabled={disabled || isSaving}
                onClick={() => toggleSetting(setting.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                  enabled ? "bg-brand-forest" : "bg-brand-border"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
