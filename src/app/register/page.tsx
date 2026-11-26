import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a new Date² account.",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create your Date² account"
      subtitle="Choose a username and enter your email and password to get started."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-forest transition-colors hover:text-brand-mintHover hover:underline"
          >
            Log in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
