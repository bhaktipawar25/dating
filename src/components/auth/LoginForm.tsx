"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AuthServiceError,
  authService,
  type AuthUser,
} from "@/services/auth/authService";
import { profileService } from "@/services/profile/profileService";
import { securityService } from "@/services/security/securityService";
import {
  validateLoginIdentifier,
  validateLoginPassword,
} from "@/lib/validation/authValidation";
import { FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";
import { StatusBanner } from "./StatusBanner";
import { SubmitButton } from "./SubmitButton";

interface LoginFormProps {
  verifiedNotice?: boolean;
  prefilledIdentifier?: string;
}

export function LoginForm({
  verifiedNotice = false,
  prefilledIdentifier = "",
}: LoginFormProps) {
  const [identifier, setIdentifier] = useState(prefilledIdentifier);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    identifier?: string | null;
    password?: string | null;
  }>({});
  const [formError, setFormError] = useState<{
    message: string;
    code?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(
    null
  );
  const [nextDestination, setNextDestination] = useState<{
    href: string;
    label: string;
  }>({
    href: "/security-check",
    label: "Continue to Security Check",
  });

  const validateAll = (): boolean => {
    const identifierError = validateLoginIdentifier(identifier);
    const passwordError = validateLoginPassword(password);

    setErrors({
      identifier: identifierError,
      password: passwordError,
    });

    return !identifierError && !passwordError;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.login({ identifier, password });
      try {
        const kyc = await securityService.getKycStatus();
        if (kyc.overallStatus === "VERIFIED") {
          const profile = await profileService.getPersonalInfo();
          if (profile?.profileCompleted) {
            setNextDestination({
              href: "/home",
              label: "Continue to Home",
            });
          } else {
            setNextDestination({
              href: "/onboarding/personal-info",
              label: "Continue to Personal Information",
            });
          }
        }
      } catch {
        // Default to /security-check if status probe fails
      }
      setAuthenticatedUser(response.user);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setFormError({ message: err.message, code: err.code });
        if (err.fieldErrors) {
          setErrors((prev) => ({
            ...prev,
            identifier: err.fieldErrors?.identifier ?? prev.identifier,
            password: err.fieldErrors?.password ?? prev.password,
          }));
        }
      } else {
        setFormError({
          message: "Unable to sign in right now. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authenticatedUser) {
    return (
      <div className="space-y-5">
        <StatusBanner
          variant="success"
          title="Welcome back"
          message={`Signed in as ${authenticatedUser.username} (${authenticatedUser.email}).`}
        />

        <div className="rounded-2xl border border-brand-border bg-brand-ice/60 p-4 text-sm">
          <dl className="space-y-2">
            <div className="flex items-center justify-between">
              <dt className="text-brand-muted">Username</dt>
              <dd className="font-semibold text-brand-ink">
                @{authenticatedUser.username}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-brand-muted">Email</dt>
              <dd className="font-medium text-brand-ink">
                {authenticatedUser.email}
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-3">
          <Link
            href={nextDestination.href}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            {nextDestination.label}
          </Link>

          <SubmitButton
            type="button"
            variant="secondary"
            onClick={() => {
              setAuthenticatedUser(null);
              setPassword("");
            }}
          >
            Switch account
          </SubmitButton>
        </div>
      </div>
    );
  }

  const verifyEmailHref = identifier.includes("@")
    ? `/verify-email?email=${encodeURIComponent(identifier.trim())}`
    : "/verify-email";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {verifiedNotice && (
        <StatusBanner
          variant="success"
          message="Your email has been verified. Sign in to continue."
        />
      )}

      {formError && (
        <StatusBanner
          variant="error"
          message={formError.message}
          action={
            formError.code === "EMAIL_NOT_VERIFIED" ? (
              <Link
                href={verifyEmailHref}
                className="inline-flex text-xs font-semibold text-rose-900 underline underline-offset-2 hover:text-rose-700"
              >
                Verify your email →
              </Link>
            ) : undefined
          }
        />
      )}

      <FormField
        id="login-identifier"
        label="Username or Email Address"
        required
        error={errors.identifier}
      >
        <input
          id="login-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="Enter your username or email"
          value={identifier}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.identifier)}
          aria-describedby={
            errors.identifier ? "login-identifier-error" : undefined
          }
          onChange={(e) => {
            const next = e.target.value;
            setIdentifier(next);
            if (errors.identifier) {
              setErrors((prev) => ({
                ...prev,
                identifier: validateLoginIdentifier(next),
              }));
            }
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              identifier: validateLoginIdentifier(identifier),
            }))
          }
          className={`auth-input-base ${
            errors.identifier
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : ""
          }`}
        />
      </FormField>

      <FormField
        id="login-password"
        label="Password"
        required
        error={errors.password}
        rightAccessory={
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-brand-forest transition-colors hover:text-brand-mintHover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint"
          >
            Forgot password?
          </Link>
        }
      >
        <PasswordInput
          id="login-password"
          name="password"
          value={password}
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={isSubmitting}
          hasError={Boolean(errors.password)}
          describedBy={errors.password ? "login-password-error" : undefined}
          onChange={(next) => {
            setPassword(next);
            if (errors.password) {
              setErrors((prev) => ({
                ...prev,
                password: validateLoginPassword(next),
              }));
            }
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              password: validateLoginPassword(password),
            }))
          }
        />
      </FormField>

      <SubmitButton isLoading={isSubmitting} loadingText="Logging in...">
        Log in
      </SubmitButton>
    </form>
  );
}
