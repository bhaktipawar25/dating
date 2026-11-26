"use client";

import React from "react";
import {
  DISCOVERY_PREFERENCE_OPTIONS,
  SEX_OPTIONS,
  type DiscoveryPreferenceId,
  type ProfileVisibilitySettings,
  type SexOptionId,
} from "@/lib/profile/personalInfoConfig";
import type { InterestCategory } from "@/services/profile/types";

interface ProfilePreviewCardProps {
  username?: string;
  sex: SexOptionId | null;
  interestedIn: DiscoveryPreferenceId[];
  selectedInterestIds: string[];
  categories: InterestCategory[];
  visibility: ProfileVisibilitySettings;
}

export function ProfilePreviewCard({
  username,
  sex,
  interestedIn,
  selectedInterestIds,
  categories,
  visibility,
}: ProfilePreviewCardProps) {
  const sexLabel = SEX_OPTIONS.find((s) => s.id === sex)?.label ?? null;

  const interestedInLabels = DISCOVERY_PREFERENCE_OPTIONS.filter((opt) =>
    interestedIn.includes(opt.id)
  ).map((opt) => opt.label);

  const labelById = new Map<string, string>();
  for (const cat of categories) {
    for (const tag of cat.tags) {
      labelById.set(tag.id, tag.label);
    }
  }

  const orderedInterestLabels = selectedInterestIds.map(
    (id) => labelById.get(id) ?? id
  );

  return (
    <aside
      aria-label="Live profile preview"
      className="rounded-3xl border border-brand-border bg-white p-6 shadow-card lg:sticky lg:top-8"
    >
      <div className="flex items-center justify-between gap-2 border-b border-brand-border/70 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-forest/80">
            Profile Preview
          </p>
          <p className="mt-0.5 text-lg font-bold text-brand-ink">
            {username ? `@${username}` : "Date² Member"}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            visibility.showInDiscovery
              ? "bg-brand-ice text-brand-forest"
              : "bg-brand-canvas text-brand-muted border border-brand-border"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              visibility.showInDiscovery ? "bg-brand-mint" : "bg-brand-muted/60"
            }`}
          />
          {visibility.showInDiscovery ? "Visible" : "Hidden"}
        </span>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        {/* Sex */}
        <div className="rounded-2xl border border-brand-border/70 bg-brand-ice/45 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            About You
          </p>
          <p className="mt-1 font-semibold text-brand-ink">
            {!sexLabel
              ? "Not selected yet"
              : visibility.showSexOnProfile
                ? sexLabel
                : `${sexLabel} (hidden on public profile)`}
          </p>
        </div>

        {/* Discovery Preferences */}
        <div className="rounded-2xl border border-brand-border/70 bg-brand-ice/45 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Interested In
          </p>
          {interestedInLabels.length === 0 ? (
            <p className="mt-1 text-xs text-brand-muted">
              No discovery preferences selected yet
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {interestedInLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-brand-border bg-white px-2.5 py-0.5 text-xs font-medium text-brand-ink"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Selected Interests */}
        <div className="rounded-2xl border border-brand-border/70 bg-brand-ice/45 p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
              Selected Interests
            </p>
            {!visibility.showInterestsOnProfile && (
              <span className="text-[11px] font-medium text-brand-muted">
                Hidden on profile
              </span>
            )}
          </div>

          {orderedInterestLabels.length === 0 ? (
            <p className="mt-1 text-xs text-brand-muted">
              Your chosen interests will appear here in order.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {orderedInterestLabels.map((label, idx) => (
                <span
                  key={selectedInterestIds[idx]}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    visibility.showInterestsOnProfile
                      ? "bg-brand-forest text-white"
                      : "border border-brand-border bg-white text-brand-muted"
                  }`}
                >
                  <span className="text-[10px] opacity-80">{idx + 1}.</span>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
