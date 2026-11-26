import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in with your username or registered email on Date².",
};

interface LoginPageProps {
  searchParams: Promise<{
    verified?: string;
    signup?: string;
    email?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const verifiedNotice = params.verified === "1";
  const postSignupNotice = params.signup === "1";
  const prefilledEmail = typeof params.email === "string" ? params.email : "";

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Log in with your username or registered email."
      backHref="/welcome"
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline"
          >
            Sign Up
          </Link>
        </p>
      }
    >
      <LoginForm
        verifiedNotice={verifiedNotice}
        postSignupNotice={postSignupNotice}
        prefilledIdentifier={prefilledEmail}
      />
    </AuthLayout>
  );
}
