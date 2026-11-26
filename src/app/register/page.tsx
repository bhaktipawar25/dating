import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Your Account",
  description: "Begin your verified, affirming journey on Date².",
};

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Begin your verified, affirming journey on Date²."
      backHref="/welcome"
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline"
          >
            Log In
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
