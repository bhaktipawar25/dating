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
      className="space-y-3.5 rounded-[18px] border border-date2-border bg-date2-surface p-3 font-helvetica xs:p-3.5 sm:p-5"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            id="profile-visibility-heading"
            className="text-base font-bold text-date2-ink"
          >
            Profile Visibility
          </h3>
          <p className="mt-0.5 text-xs text-date2-slate">
            Control what appears on your Date² profile and who can discover you.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || isSaving}
          onClick={onSaveChanges}
          className="inline-flex w-full shrink-0 items-center justify-center rounded-xl border border-date2-softBorder bg-date2-white px-3.5 py-2 text-xs font-bold text-date2-deepIndigo shadow-sm transition-colors hover:border-date2-violet hover:bg-date2-lavenderMist focus:outline-none focus-visible:ring-2 focus-visible:ring-date2-violet disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
              className={`flex items-start justify-between gap-3 rounded-[14px] border p-3 transition-colors sm:items-center sm:gap-4 sm:p-3.5 ${
                enabled
                  ? "border-date2-paleLavender bg-date2-white"
                  : "border-date2-border bg-date2-canvas"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <p className="text-sm font-bold leading-snug text-date2-ink">
                    {setting.label}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      enabled
                        ? "bg-date2-lavenderMist text-date2-deepIndigo"
                        : "bg-date2-surface text-date2-muted"
                    }`}
                  >
                    {enabled ? "Visible" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-date2-slate">
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender disabled:cursor-not-allowed disabled:opacity-60 ${
                  enabled ? "bg-date2-midnight" : "bg-date2-softBorder"
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
