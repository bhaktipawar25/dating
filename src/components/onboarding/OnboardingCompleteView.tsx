"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
import {
  DISCOVERY_PREFERENCE_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/profile/personalInfoConfig";
import {
  profileService,
  type InterestCategory,
  type PersonalInfoResponse,
} from "@/services/profile/profileService";
import { OnboardingLayout } from "./OnboardingLayout";
import { ProfilePreviewCard } from "./ProfilePreviewCard";

export function OnboardingCompleteView() {
  const [saved, setSaved] = useState<PersonalInfoResponse | null>(null);
  const [categories, setCategories] = useState<InterestCategory[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      profileService.getPersonalInfo(controller.signal),
      profileService.getInterests(controller.signal),
    ])
      .then(([profileRes, interestsRes]) => {
        setSaved(profileRes);
        setCategories(interestsRes.categories);
      })
      .catch(() => {
        // Non-fatal preview fallback
      });
    return () => controller.abort();
  }, []);

  const savedSexLabel =
    SEX_OPTIONS.find((s) => s.id === saved?.personalInfo.sex)?.label ?? "—";
  const savedDiscoveryLabels = saved?.personalInfo.interestedIn
    ? DISCOVERY_PREFERENCE_OPTIONS.filter((opt) =>
        saved.personalInfo.interestedIn.includes(opt.id)
      ).map((opt) => opt.label)
    : [];

  return (
    <OnboardingGuard requiredStage="completed">
      {({ user }) => (
        <OnboardingLayout currentStep={4}>
          <div className="grid grid-cols-1 gap-6 font-helvetica lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="space-y-5 rounded-[24px] border border-date2-border bg-date2-white p-6 shadow-indigoCard sm:p-8 lg:col-span-7">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-date2-violet bg-date2-lavenderMist text-date2-midnight shadow-indigoSoft">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-8 w-8 text-date2-deepIndigo"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-date2-ink sm:text-[28px]">
                    Welcome{user?.username ? `, @${user.username}` : ""}!
                  </h1>
                  <p className="mt-1 text-sm leading-relaxed text-date2-slate">
                    Your profile is complete and safely saved. You are ready to
                    experience respectful dating and companionship on Date².
                  </p>
                </div>
              </div>

              <StatusBanner
                variant="success"
                title="Profile Verified & Ready"
                message={
                  saved?.message ??
                  "Your account and personal preferences are ready for discovery."
                }
              />

              {/* Summary Snapshot Card from Actual Saved Profile Data */}
              {saved?.personalInfo && (
                <div className="space-y-3 rounded-[18px] border border-date2-border bg-date2-surface p-5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-date2-slate">Identity</span>
                    <span className="font-bold text-date2-ink">
                      {savedSexLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-date2-border pt-3">
                    <span className="font-bold text-date2-slate">
                      Interested In
                    </span>
                    <span className="text-right font-bold text-date2-ink">
                      {savedDiscoveryLabels.join(", ") || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-date2-border pt-3">
                    <span className="font-bold text-date2-slate">
                      Selected Interests
                    </span>
                    <span className="font-bold text-date2-ink">
                      {saved.personalInfo.interests.length} selected
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-date2-border pt-3">
                    <span className="font-bold text-date2-slate">
                      Discovery Visibility
                    </span>
                    <span className="font-bold text-date2-deepIndigo">
                      {saved.personalInfo.visibility.showInDiscovery
                        ? "Visible in discovery"
                        : "Hidden from discovery"}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link
                  href="/home"
                  className="inline-flex h-[52px] flex-1 items-center justify-center rounded-[14px] bg-date2-midnight px-5 font-helvetica text-[15px] font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
                >
                  Begin Discovering Connections
                </Link>
                <Link
                  href="/onboarding/personal-info"
                  className="inline-flex h-[52px] flex-1 items-center justify-center rounded-[14px] border border-date2-softBorder bg-date2-white px-5 font-helvetica text-[15px] font-bold text-date2-ink transition-colors hover:border-date2-violet hover:bg-date2-lavenderMist/60"
                >
                  Edit Personal Information
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              {saved?.personalInfo && (
                <ProfilePreviewCard
                  username={user?.username}
                  sex={saved.personalInfo.sex}
                  interestedIn={saved.personalInfo.interestedIn}
                  selectedInterestIds={saved.personalInfo.interests}
                  categories={categories}
                  visibility={saved.personalInfo.visibility}
                />
              )}
            </div>
          </div>
        </OnboardingLayout>
      )}
    </OnboardingGuard>
  );
}
