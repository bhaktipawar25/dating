import type { Metadata } from "next";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Meet someone who gets you. Real connections, memorable dates, and safe companionship on Date².",
};

export default function WelcomePage() {
  return <WelcomeScreen />;
}
