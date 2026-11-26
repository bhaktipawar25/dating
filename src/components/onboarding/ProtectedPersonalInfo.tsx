"use client";

import React from "react";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
import { PersonalInfoOnboarding } from "./PersonalInfoOnboarding";

export function ProtectedPersonalInfo() {
  return (
    <OnboardingGuard requiredStage="personal-info">
      {({ user }) => <PersonalInfoOnboarding user={user} />}
    </OnboardingGuard>
  );
}
