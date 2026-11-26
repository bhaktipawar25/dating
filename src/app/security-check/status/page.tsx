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
        subtitle="Track live updates for your Face Scan and Government ID verification."
      >
        <SecurityStatusView />
      </SecurityLayout>
    </OnboardingGuard>
  );
}
