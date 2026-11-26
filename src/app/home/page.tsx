import type { Metadata } from "next";
import { ProtectedHomeDashboard } from "@/components/home/ProtectedHomeDashboard";

export const metadata: Metadata = {
  title: "Home",
  description: "Match, Chat, and Play Games on Date².",
};

export default function HomeDashboardPage() {
  return <ProtectedHomeDashboard />;
}
