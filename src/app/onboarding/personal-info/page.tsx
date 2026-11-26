import type { Metadata } from "next";
import { ProtectedPersonalInfo } from "@/components/onboarding/ProtectedPersonalInfo";

export const metadata: Metadata = {
  title: "Personal Information",
  description:
    "Tell Date² about yourself, your discovery preferences, and what you like.",
};

export default function PersonalInfoPage() {
  return <ProtectedPersonalInfo />;
}
