import type { Metadata } from "next";
import { SplashScreen } from "@/components/auth/SplashScreen";

export const metadata: Metadata = {
  title: "Date² — Date Smart • Connect Meaningfully",
  description: "Inclusive Romance & Verified Companionship.",
};

export default function RootSplashPage() {
  return <SplashScreen />;
}
