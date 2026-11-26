import type { Metadata } from "next";
import { OnboardingCompleteView } from "@/components/onboarding/OnboardingCompleteView";

export const metadata: Metadata = {
  title: "Profile Complete",
  description: "Your Date² profile onboarding is complete.",
};

export default function OnboardingCompletePage() {
  return <OnboardingCompleteView />;
}
