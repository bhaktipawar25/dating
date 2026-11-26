"use client";

import React from "react";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
import { HomeDashboard } from "./HomeDashboard";

export function ProtectedHomeDashboard() {
  return (
    <OnboardingGuard requiredStage="completed">
      {({ user }) => <HomeDashboard user={user} />}
    </OnboardingGuard>
  );
}
