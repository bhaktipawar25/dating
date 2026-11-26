import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Create a strong, unique password for your Date² account.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
    email?: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const initialToken = typeof params.token === "string" ? params.token : "";
  const targetEmail = typeof params.email === "string" ? params.email : "";

  const subtitle = targetEmail
    ? `Create a strong, unique password for ${targetEmail}.`
    : "Create a strong, unique password for your Date² account.";

  return (
    <AuthLayout
      title="Set New Password"
      subtitle={subtitle}
      backHref="/login"
      footer={
        <p>
          Need a fresh reset code?{" "}
          <Link
            href="/forgot-password"
            className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline"
          >
            Request Verification Code
          </Link>
        </p>
      }
    >
      <ResetPasswordForm
        initialToken={initialToken}
        targetEmail={targetEmail}
      />
    </AuthLayout>
  );
}
