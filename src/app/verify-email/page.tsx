import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address for your Date² account.",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string;
  }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const initialEmail = typeof params.email === "string" ? params.email : "";

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit verification code sent to your inbox."
      footer={
        <p>
          Want to use a different account?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-forest transition-colors hover:text-brand-mintHover hover:underline"
          >
            Back to sign up
          </Link>
        </p>
      }
    >
      <VerifyEmailForm initialEmail={initialEmail} />
    </AuthLayout>
  );
}
