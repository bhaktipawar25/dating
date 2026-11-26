import type { Metadata } from "next";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
import { SecurityLayout } from "@/components/security/SecurityLayout";
import { SecurityOverview } from "@/components/security/SecurityOverview";

export const metadata: Metadata = {
  title: "Security Check",
  description: "Verify your identity with Face Scan and Government ID on Date².",
};

export default function SecurityCheckPage() {
  return (
    <OnboardingGuard requiredStage="security-check">
      <SecurityLayout
        title="Security Check"
        subtitle="Complete identity verification to keep the Date² community safe and authentic."
      >
        <SecurityOverview />
      </SecurityLayout>
    </OnboardingGuard>
  );
}
