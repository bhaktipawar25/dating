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
      className="rounded-[24px] border border-date2-border bg-date2-white p-6 font-helvetica shadow-indigoCard lg:sticky lg:top-8"
    >
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-date2-midnight p-4 text-date2-white">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-lightPeriwinkle">
            Profile Preview
          </p>
          <p className="mt-0.5 truncate text-lg font-bold text-date2-white">
            {username ? `@${username}` : "Date² Member"}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
            visibility.showInDiscovery
              ? "bg-date2-white/15 text-date2-limeMark"
              : "bg-date2-charcoal text-date2-softBorder"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              visibility.showInDiscovery
                ? "bg-date2-limeMark"
                : "bg-date2-softBorder"
            }`}
          />
          {visibility.showInDiscovery ? "Visible" : "Hidden"}
        </span>
      </div>

      <div className="mt-4 space-y-3.5 text-sm">
        {/* Sex */}
        <div className="rounded-[16px] border border-date2-border bg-date2-surface p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-date2-muted">
            About You
          </p>
          <p className="mt-1 font-bold text-date2-ink">
            {!sexLabel
              ? "Not selected yet"
              : visibility.showSexOnProfile
                ? sexLabel
                : "Hidden on public profile"}
          </p>
        </div>

        {/* Discovery Preferences */}
        <div className="rounded-[16px] border border-date2-border bg-date2-surface p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-date2-muted">
            Interested In
          </p>
          {interestedInLabels.length === 0 ? (
            <p className="mt-1 text-xs text-date2-slate">
              No discovery preferences selected yet
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {interestedInLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-date2-paleLavender bg-date2-white px-2.5 py-0.5 text-xs font-bold text-date2-deepIndigo"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Selected Interests */}
        <div className="rounded-[16px] border border-date2-border bg-date2-surface p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-date2-muted">
              Selected Interests
            </p>
            {!visibility.showInterestsOnProfile && (
              <span className="text-[11px] font-bold text-date2-muted">
                Hidden on profile
              </span>
            )}
          </div>

          {!visibility.showInterestsOnProfile ? (
            <p className="mt-1 text-xs text-date2-slate">
              Interests are hidden per your visibility settings.
            </p>
          ) : orderedInterestLabels.length === 0 ? (
            <p className="mt-1 text-xs text-date2-slate">
              Your chosen interests will appear here in order.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {orderedInterestLabels.map((label, idx) => (
                <span
                  key={selectedInterestIds[idx]}
                  className="inline-flex items-center gap-1 rounded-full bg-date2-midnight px-2.5 py-1 text-xs font-bold text-date2-white"
                >
                  <span className="text-[10px] text-date2-limeMark">
                    {idx + 1}.
                  </span>
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
