import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Date² account.",
};

interface LoginPageProps {
  searchParams: Promise<{
    verified?: string;
    email?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const verifiedNotice = params.verified === "1";
  const prefilledEmail = typeof params.email === "string" ? params.email : "";

  return (
    <AuthLayout
      title="Log in to Date²"
      subtitle="Enter your username or email address and password to continue."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-forest transition-colors hover:text-brand-mintHover hover:underline"
          >
            Create Account
          </Link>
        </p>
      }
    >
      <LoginForm
        verifiedNotice={verifiedNotice}
        prefilledIdentifier={prefilledEmail}
      />
    </AuthLayout>
  );
}
