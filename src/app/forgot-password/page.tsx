import type { Metadata } from "next";
import Link from "next/link";
import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a 6-digit password reset code for your Date² account.",
};

export default function ForgotPasswordPage() {
  const isMockDev =
    AUTH_CONFIG.mode === "mock" && process.env.NODE_ENV !== "production";

  const subtitle = isMockDev
    ? "Enter your registered email address to request a 6-digit password reset code (Demo Mode — no real email is sent)."
    : "Enter your registered email address to request a 6-digit password reset code.";

  return (
    <AuthLayout
      title="Reset Password"
      subtitle={subtitle}
      backHref="/login"
      footer={
        <p>
          Remember password?{" "}
          <Link
            href="/login"
            className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline"
          >
            Log In
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
