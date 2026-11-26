import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your Date² account.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const initialToken = typeof params.token === "string" ? params.token : "";

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used previously."
      footer={
        <p>
          Need a fresh reset link?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-brand-forest transition-colors hover:text-brand-mintHover hover:underline"
          >
            Request reset email
          </Link>
        </p>
      }
    >
      <ResetPasswordForm initialToken={initialToken} />
    </AuthLayout>
  );
}
