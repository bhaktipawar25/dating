import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Date² account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email address and we will send password reset instructions."
      footer={
        <p>
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-forest transition-colors hover:text-brand-mintHover hover:underline"
          >
            Back to login
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
