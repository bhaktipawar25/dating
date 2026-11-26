"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
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

  return (
    <OnboardingGuard requiredStage="completed">
      {({ user }) => (
        <OnboardingLayout currentStep={3}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-card sm:p-8 lg:col-span-7 space-y-5">
              <h1 className="text-2xl font-bold tracking-tight text-brand-ink sm:text-[28px]">
                Your Date² profile is ready
              </h1>
              <p className="text-sm leading-relaxed text-brand-muted">
                You have completed email verification, security verification,
                and your personal information preferences.
              </p>

              <StatusBanner
                variant="success"
                title="Onboarding complete"
                message={
                  saved?.message ??
                  "Your account and personal preferences are ready for the next stage."
                }
              />

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link
                  href="/home"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover"
                >
                  Open Date² Home
                </Link>
                <Link
                  href="/onboarding/personal-info"
                  className="inline-flex flex-1 items-center justify-center rounded-xl border border-brand-border bg-brand-ice/75 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost"
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
