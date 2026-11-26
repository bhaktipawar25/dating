"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { SubmitButton } from "@/components/auth/SubmitButton";
import {
  DEFAULT_VISIBILITY_SETTINGS,
  DISCOVERY_PREFERENCE_OPTIONS,
  PROFILE_VISIBILITY_OPTIONS,
  SEX_OPTIONS,
  type DiscoveryPreferenceId,
  type ProfileVisibilitySettings,
  type SexOptionId,
} from "@/lib/profile/personalInfoConfig";
import type { AuthUser } from "@/services/auth/types";
import {
  ProfileServiceError,
  profileService,
  type InterestCategory,
} from "@/services/profile/profileService";
import { DiscoveryPreferencesSection } from "./DiscoveryPreferencesSection";
import { InterestSelectionSection } from "./InterestSelectionSection";
import { OnboardingLayout } from "./OnboardingLayout";
import { ProfilePreviewCard } from "./ProfilePreviewCard";
import { ProfileVisibilitySection } from "./ProfileVisibilitySection";
import { SexSelectionSection } from "./SexSelectionSection";

interface PersonalInfoOnboardingProps {
  user?: AuthUser;
}

export function PersonalInfoOnboarding({ user }: PersonalInfoOnboardingProps) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sex, setSex] = useState<SexOptionId | null>(null);
  const [interestedIn, setInterestedIn] = useState<DiscoveryPreferenceId[]>([]);
  const [visibility, setVisibility] = useState<ProfileVisibilitySettings>(
    DEFAULT_VISIBILITY_SETTINGS
  );
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

  const [categories, setCategories] = useState<InterestCategory[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [interestsLoadError, setInterestsLoadError] = useState<string | null>(
    null
  );

  const [sexError, setSexError] = useState<string | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [interestsError, setInterestsError] = useState<string | null>(null);

  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilitySaveStatus, setVisibilitySaveStatus] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);

  const [isCompleting, setIsCompleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadInterests = useCallback(async (signal?: AbortSignal) => {
    setLoadingInterests(true);
    setInterestsLoadError(null);
    try {
      const response = await profileService.getInterests(signal);
      setCategories(response.categories);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setInterestsLoadError(
        err instanceof ProfileServiceError
          ? err.message
          : "Unable to load interests. Please try again."
      );
    } finally {
      setLoadingInterests(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadInterests(controller.signal);

    profileService
      .getPersonalInfo(controller.signal)
      .then((saved) => {
        if (!saved?.personalInfo) return;
        setSex(saved.personalInfo.sex);
        setInterestedIn(saved.personalInfo.interestedIn);
        setVisibility(saved.personalInfo.visibility);
        setSelectedInterestIds(saved.personalInfo.interests);
      })
      .catch(() => {
        // Non-blocking preload
      });

    return () => controller.abort();
  }, [loadInterests]);

  const tagLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      for (const tag of cat.tags) {
        map.set(tag.id, tag.label);
      }
    }
    return map;
  }, [categories]);

  const validateStep1 = (): boolean => {
    let valid = true;
    if (!sex) {
      setSexError("Please select one of the four options above.");
      valid = false;
    }
    if (interestedIn.length === 0) {
      setDiscoveryError("Please select at least one discovery preference.");
      valid = false;
    }
    return valid;
  };

  const handleContinueToInterests = () => {
    setSubmitError(null);
    if (!validateStep1()) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinueToReview = () => {
    setSubmitError(null);
    if (selectedInterestIds.length === 0) {
      setInterestsError("Please select at least one interest to continue.");
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveVisibility = async () => {
    if (savingVisibility || isCompleting) return;
    setVisibilitySaveStatus(null);

    if (!validateStep1() || !sex) {
      setVisibilitySaveStatus({
        variant: "error",
        message:
          "Select your sex and at least one discovery preference before saving.",
      });
      return;
    }

    setSavingVisibility(true);
    try {
      const response = await profileService.savePersonalInfo({
        sex,
        interestedIn,
        interests: selectedInterestIds,
        visibility,
        completeOnboarding: false,
      });
      setVisibilitySaveStatus({
        variant: "success",
        message: response.message,
      });
    } catch (err) {
      setVisibilitySaveStatus({
        variant: "error",
        message:
          err instanceof ProfileServiceError
            ? err.message
            : "Unable to save visibility settings. Your selections were preserved.",
      });
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (isCompleting) return;
    setSubmitError(null);

    if (!validateStep1() || !sex) {
      setStep(1);
      return;
    }

    if (selectedInterestIds.length === 0) {
      setInterestsError("Please select at least one interest to continue.");
      setStep(2);
      return;
    }

    setIsCompleting(true);
    try {
      const response = await profileService.savePersonalInfo({
        sex,
        interestedIn,
        interests: selectedInterestIds,
        visibility,
        completeOnboarding: true,
      });

      if (response.profileCompleted) {
        router.push("/onboarding/complete");
      } else {
        setSubmitError(
          response.message ||
            "Profile was not marked complete by the server. Please review and try again."
        );
      }
    } catch (err) {
      setSubmitError(
        err instanceof ProfileServiceError
          ? err.message
          : "Unable to save your personal information. Your selections have been preserved."
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const sexLabel = SEX_OPTIONS.find((opt) => opt.id === sex)?.label ?? "";
  const discoveryLabels = DISCOVERY_PREFERENCE_OPTIONS.filter((opt) =>
    interestedIn.includes(opt.id)
  ).map((opt) => opt.label);

  return (
    <OnboardingLayout currentStep={step}>
      <div className="grid grid-cols-1 gap-6 font-helvetica lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Main Step Card */}
        <div className="rounded-[24px] border border-date2-border bg-date2-white p-5 shadow-indigoCard sm:p-8 lg:col-span-7">
          {submitError && (
            <div className="mb-5">
              <StatusBanner variant="error" message={submitError} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-7">
              <SexSelectionSection
                value={sex}
                onChange={(next) => {
                  setSex(next);
                  setSexError(null);
                  setVisibilitySaveStatus(null);
                }}
                error={sexError}
                disabled={isCompleting}
              />

              <hr className="border-date2-border" />

              <DiscoveryPreferencesSection
                selected={interestedIn}
                onChange={(next) => {
                  setInterestedIn(next);
                  setDiscoveryError(null);
                  setVisibilitySaveStatus(null);
                }}
                error={discoveryError}
                disabled={isCompleting}
              />

              <hr className="border-date2-border" />

              <ProfileVisibilitySection
                value={visibility}
                onChange={(next) => {
                  setVisibility(next);
                  setVisibilitySaveStatus(null);
                }}
                onSaveChanges={() => void handleSaveVisibility()}
                isSaving={savingVisibility}
                saveStatus={visibilitySaveStatus}
                disabled={isCompleting}
              />

              <div className="pt-2">
                <SubmitButton type="button" onClick={handleContinueToInterests}>
                  Continue to Interests
                </SubmitButton>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <InterestSelectionSection
                categories={categories}
                loading={loadingInterests}
                loadError={interestsLoadError}
                onRetryLoad={() => void loadInterests()}
                selectedInterestIds={selectedInterestIds}
                onChangeSelected={(next) => {
                  setSelectedInterestIds(next);
                  if (next.length > 0) setInterestsError(null);
                }}
                validationError={interestsError}
                disabled={isCompleting}
              />

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <SubmitButton
                  type="button"
                  variant="secondary"
                  disabled={isCompleting}
                  onClick={() => setStep(1)}
                >
                  Back to About You
                </SubmitButton>
                <SubmitButton type="button" onClick={handleContinueToReview}>
                  Review Profile
                </SubmitButton>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-date2-ink sm:text-[26px]">
                  Ready to step in?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-date2-slate">
                  Take a moment to review how your profile will appear to the
                  community. You can adjust any detail below before completing.
                </p>
              </div>

              {/* Section Review Card: Sex */}
              <div className="rounded-[18px] border border-date2-border bg-date2-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-date2-ink">About You</h3>
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="mt-2 inline-block rounded-xl bg-date2-lavenderMist px-3 py-1.5 text-xs font-bold text-date2-midnight">
                  {sexLabel}
                </p>
              </div>

              {/* Section Review Card: Interested In */}
              <div className="rounded-[18px] border border-date2-border bg-date2-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-date2-ink">
                    Interested In
                  </h3>
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {discoveryLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-date2-paleLavender bg-date2-white px-3 py-1 text-xs font-bold text-date2-deepIndigo"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Section Review Card: Profile Visibility */}
              <div className="rounded-[18px] border border-date2-border bg-date2-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-date2-ink">
                    Profile Visibility
                  </h3>
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <ul className="mt-2 space-y-1.5 text-xs text-date2-slate">
                  {PROFILE_VISIBILITY_OPTIONS.map((opt) => (
                    <li
                      key={opt.key}
                      className="flex items-center justify-between"
                    >
                      <span>{opt.label}</span>
                      <span className="font-bold text-date2-midnight">
                        {visibility[opt.key] ? "Enabled" : "Hidden"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section Review Card: What Do You Like? */}
              <div className="rounded-[18px] border border-date2-border bg-date2-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-date2-ink">
                    What Do You Like? ({selectedInterestIds.length})
                  </h3>
                  <button
                    type="button"
                    disabled={isCompleting}
                    onClick={() => setStep(2)}
                    className="text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedInterestIds.map((id, idx) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full bg-date2-midnight px-3 py-1 text-xs font-bold text-date2-white"
                    >
                      <span className="text-[10px] text-date2-limeMark">
                        {idx + 1}.
                      </span>
                      <span>{tagLabelMap.get(id) ?? id}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <SubmitButton
                  type="button"
                  variant="secondary"
                  disabled={isCompleting}
                  onClick={() => setStep(2)}
                >
                  Back to Interests
                </SubmitButton>
                <SubmitButton
                  type="button"
                  isLoading={isCompleting}
                  loadingText="Completing Profile..."
                  onClick={() => void handleCompleteProfile()}
                >
                  Complete Profile
                </SubmitButton>
              </div>
            </div>
          )}
        </div>

        {/* Live Profile Preview Sidebar */}
        <div className="lg:col-span-5">
          <ProfilePreviewCard
            username={user?.username}
            sex={sex}
            interestedIn={interestedIn}
            selectedInterestIds={selectedInterestIds}
            categories={categories}
            visibility={visibility}
          />
        </div>
      </div>
    </OnboardingLayout>
  );
}
