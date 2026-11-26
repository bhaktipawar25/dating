import type { Metadata } from "next";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
import { SecurityLayout } from "@/components/security/SecurityLayout";
import { SecurityStatusView } from "@/components/security/SecurityStatusView";

export const metadata: Metadata = {
  title: "Verification Status",
  description: "View your Date² identity verification status.",
};

export default function SecurityStatusPage() {
  return (
    <OnboardingGuard requiredStage="security-check">
      <SecurityLayout
        title="Verification Status"
        subtitle="Track the status of your face scan and government ID submission."
      >
        <SecurityStatusView />
      </SecurityLayout>
    </OnboardingGuard>
  );
}
