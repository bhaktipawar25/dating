import type { Metadata } from "next";
import { OnboardingGuard } from "@/components/guards/OnboardingGuard";
import { DocumentVerificationFlow } from "@/components/security/DocumentVerificationFlow";
import { SecurityLayout } from "@/components/security/SecurityLayout";

export const metadata: Metadata = {
  title: "Document Verification",
  description: "Upload a government-issued ID to verify your Date² account.",
};

export default function DocumentVerificationPage() {
  return (
    <OnboardingGuard requiredStage="security-check">
      <SecurityLayout
        title="Government ID Verification"
        subtitle="Select your issuing country, choose an eligible document, and upload or capture clear ID images."
      >
        <DocumentVerificationFlow />
      </SecurityLayout>
    </OnboardingGuard>
  );
}
