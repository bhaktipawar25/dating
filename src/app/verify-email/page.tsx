import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify Your Email",
  description: "Enter the 6-digit verification code for your Date² account.",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{
    email?: string;
    mode?: string;
    created?: string;
  }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const initialEmail = typeof params.email === "string" ? params.email : "";
  const mode = params.mode === "reset" ? "reset" : "verify";
  const createdNotice = params.created === "1";

  const title = mode === "reset" ? "Verify Reset Code" : "Verify Your Email";
  const subtitle = initialEmail
    ? `Enter the 6-digit verification code sent to ${initialEmail}.`
    : "Enter the 6-digit verification code sent to your inbox.";

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      backHref={mode === "reset" ? "/forgot-password" : "/register"}
      footer={
        mode === "reset" ? (
          <p>
            Remember password?{" "}
            <Link
              href="/login"
              className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline"
            >
              Log In
            </Link>
          </p>
        ) : (
          <p>
            Need to start fresh?{" "}
            <Link
              href="/register"
              className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline"
            >
              Back to Sign Up
            </Link>
          </p>
        )
      }
    >
      <VerifyEmailForm
        initialEmail={initialEmail}
        mode={mode}
        createdNotice={createdNotice}
      />
    </AuthLayout>
  );
}
