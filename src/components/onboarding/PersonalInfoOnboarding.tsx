"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { SubmitButton } from "@/components/auth/SubmitButton";
import {
  DEFAULT_VISIBILITY_SETTINGS,
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

  const [step, setStep] = useState<1 | 2>(1);
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
    loadInterests(controller.signal);

    // Preload any previously saved personal info if backend exposes it
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

  const validateSectionA = (): boolean => {
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
    if (!validateSectionA()) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveVisibility = async () => {
    if (savingVisibility || isCompleting) return;
    setVisibilitySaveStatus(null);

    if (!validateSectionA() || !sex) {
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
            : "Unable to save visibility settings. Your selections were kept.",
      });
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (isCompleting) return;
    setSubmitError(null);

    if (!validateSectionA() || !sex) {
      setStep(1);
      return;
    }

    if (selectedInterestIds.length === 0) {
      setInterestsError("Please select at least one interest to continue.");
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
        router.push("/home");
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

  return (
    <OnboardingLayout currentStep={step}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Main Form Card */}
        <div className="rounded-3xl border border-brand-border bg-white p-5 shadow-card sm:p-8 lg:col-span-7">
          {submitError && (
            <div className="mb-5">
              <StatusBanner variant="error" message={submitError} />
            </div>
          )}

          {step === 1 ? (
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

              <hr className="border-brand-border/70" />

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

              <hr className="border-brand-border/70" />

              <ProfileVisibilitySection
                value={visibility}
                onChange={(next) => {
                  setVisibility(next);
                  setVisibilitySaveStatus(null);
                }}
                onSaveChanges={handleSaveVisibility}
                isSaving={savingVisibility}
                saveStatus={visibilitySaveStatus}
                disabled={isCompleting}
              />

              <div className="pt-2">
                <SubmitButton
                  type="button"
                  onClick={handleContinueToInterests}
                >
                  Continue to Interests
                </SubmitButton>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <InterestSelectionSection
                categories={categories}
                loading={loadingInterests}
                loadError={interestsLoadError}
                onRetryLoad={() => loadInterests()}
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
                <SubmitButton
                  type="button"
                  isLoading={isCompleting}
                  loadingText="Completing profile..."
                  onClick={handleCompleteProfile}
                >
                  Complete Profile
                </SubmitButton>
              </div>
            </div>
          )}
        </div>

        {/* Live Profile Preview */}
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
