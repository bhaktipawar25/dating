"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthServiceError,
  authService,
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
  postSignupNotice?: boolean;
  prefilledIdentifier?: string;
}

export function LoginForm({
  verifiedNotice = false,
  postSignupNotice = false,
  prefilledIdentifier = "",
}: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(prefilledIdentifier);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    identifier?: string | null;
    password?: string | null;
  }>({});
  const [formError, setFormError] = useState<{
    message: string;
    code?: string;
    resolvedEmail?: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await authService.login({ identifier, password });

      let destination = "/security-check";
      try {
        const kyc = await securityService.getKycStatus();
        if (kyc.overallStatus === "VERIFIED") {
          const profile = await profileService.getPersonalInfo();
          destination = profile?.profileCompleted
            ? "/home"
            : "/onboarding/personal-info";
        }
      } catch {
        destination = "/security-check";
      }

      router.push(destination);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        if (err.code === "EMAIL_NOT_VERIFIED") {
          const targetEmail =
            err.fieldErrors?.resolvedEmail ??
            (identifier.includes("@") ? identifier.trim().toLowerCase() : "");
          if (targetEmail) {
            router.push(
              `/verify-email?email=${encodeURIComponent(targetEmail)}`
            );
            return;
          }
        }

        setFormError({
          message: err.message,
          code: err.code,
          resolvedEmail: err.fieldErrors?.resolvedEmail,
        });
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
      setIsSubmitting(false);
    }
  };

  const verifyEmailHref = identifier.includes("@")
    ? `/verify-email?email=${encodeURIComponent(identifier.trim())}`
    : "/verify-email";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 font-helvetica">
      {postSignupNotice && (
        <StatusBanner
          variant="info"
          message="Account created! Log in with your credentials to trigger your 6-digit Email OTP verification."
        />
      )}

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
                href={
                  formError.resolvedEmail
                    ? `/verify-email?email=${encodeURIComponent(
                        formError.resolvedEmail
                      )}`
                    : verifyEmailHref
                }
                className="inline-flex text-xs font-bold text-rose-900 underline underline-offset-2 hover:text-rose-700"
              >
                Verify your email →
              </Link>
            ) : undefined
          }
        />
      )}

      <FormField
        id="login-identifier"
        label="Username or Email"
        required
        error={errors.identifier}
      >
        <input
          id="login-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          placeholder="e.g. ananya_24 or name@example.com"
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
          className={`date2-input-base ${
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
            className="text-xs font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-date2-violet"
          >
            Forgot Password?
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

      <SubmitButton isLoading={isSubmitting} loadingText="Authenticating...">
        Log In
      </SubmitButton>
    </form>
  );
}
