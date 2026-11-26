import type { Metadata } from "next";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
import { FaceScanFlow } from "@/components/security/FaceScanFlow";
import { SecurityLayout } from "@/components/security/SecurityLayout";

export const metadata: Metadata = {
  title: "Verify Your Identity",
  description: "Complete your Date² face scan verification.",
};

export default function FaceScanPage() {
  return (
    <OnboardingGuard requiredStage="security-check">
      <SecurityLayout
        title="Verify Your Identity"
        subtitle="Guided front-camera alignment and active liveness check processed securely in memory."
      >
        <FaceScanFlow />
      </SecurityLayout>
    </OnboardingGuard>
  );
}
