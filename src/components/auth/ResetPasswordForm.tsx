"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuthServiceError, authService } from "@/services/auth/authService";
import {
  PASSWORD_MIN_LENGTH,
  validateConfirmPassword,
  validateStrongPassword,
} from "@/lib/validation/authValidation";
import { FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { StatusBanner } from "./StatusBanner";
import { SubmitButton } from "./SubmitButton";

interface ResetPasswordFormProps {
  initialToken?: string;
  targetEmail?: string;
}

export function ResetPasswordForm({
  initialToken = "",
  targetEmail = "",
}: ResetPasswordFormProps) {
  const [token, setToken] = useState(initialToken || targetEmail);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    token?: string | null;
    newPassword?: string | null;
    confirmPassword?: string | null;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetDone, setIsResetDone] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const hasContextToken = Boolean(initialToken.trim() || targetEmail.trim());

  const validateAll = (): boolean => {
    const tokenError = token.trim()
      ? null
      : "A verified reset session or token is required.";
    const passwordError = validateStrongPassword(newPassword);
    const confirmError = validateConfirmPassword(newPassword, confirmPassword);

    setErrors({
      token: tokenError,
      newPassword: passwordError,
      confirmPassword: confirmError,
    });

    return !tokenError && !passwordError && !confirmError;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword({
        token: token.trim(),
        newPassword,
        confirmPassword,
      });
      setSuccessMessage(response.message);
      setIsResetDone(true);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setFormError(err.message);
      } else {
        setFormError("Unable to update password right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isResetDone) {
    const loginHref = targetEmail
      ? `/login?email=${encodeURIComponent(targetEmail)}`
      : "/login";

    return (
      <div className="space-y-5 font-helvetica">
        <div className="rounded-[18px] border border-date2-paleLavender bg-date2-lavenderMist p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-date2-midnight text-date2-limeMark">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-6 w-6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 13 4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-date2-ink">
            Password Updated!
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-date2-slate">
            {successMessage ||
              "Your password has been updated. Please sign in with your new credentials."}
          </p>
        </div>

        <Link
          href={loginHref}
          className="inline-flex h-[52px] w-full items-center justify-center rounded-[14px] bg-date2-midnight px-5 font-helvetica text-[15px] font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
        >
          Go to Log In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 font-helvetica">
      {formError && <StatusBanner variant="error" message={formError} />}

      {!hasContextToken && (
        <FormField
          id="reset-token"
          label="Reset Token"
          required
          error={errors.token}
          hint="Paste the token from your password reset link or complete OTP verification."
        >
          <input
            id="reset-token"
            name="token"
            type="text"
            placeholder="Paste reset token"
            value={token}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.token)}
            aria-describedby={
              errors.token ? "reset-token-error" : "reset-token-hint"
            }
            onChange={(e) => {
              setToken(e.target.value);
              if (errors.token) {
                setErrors((prev) => ({
                  ...prev,
                  token: e.target.value.trim()
                    ? null
                    : "A verified reset session or token is required.",
                }));
              }
            }}
            className={`date2-input-base ${
              errors.token
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
                : ""
            }`}
          />
        </FormField>
      )}

      <FormField
        id="reset-new-password"
        label="New Password"
        required
        error={errors.newPassword}
      >
        <PasswordInput
          id="reset-new-password"
          name="newPassword"
          value={newPassword}
          autoComplete="new-password"
          placeholder={`Minimum ${PASSWORD_MIN_LENGTH} characters`}
          disabled={isSubmitting}
          hasError={Boolean(errors.newPassword)}
          describedBy={
            errors.newPassword ? "reset-new-password-error" : undefined
          }
          onChange={(next) => {
            setNewPassword(next);
            setErrors((prev) => ({
              ...prev,
              newPassword: prev.newPassword
                ? validateStrongPassword(next)
                : null,
              confirmPassword: confirmPassword
                ? validateConfirmPassword(next, confirmPassword)
                : prev.confirmPassword,
            }));
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              newPassword: validateStrongPassword(newPassword),
            }))
          }
        />
        <PasswordStrengthMeter password={newPassword} />
      </FormField>

      <FormField
        id="reset-confirm-password"
        label="Confirm New Password"
        required
        error={errors.confirmPassword}
      >
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          value={confirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          disabled={isSubmitting}
          hasError={Boolean(errors.confirmPassword)}
          describedBy={
            errors.confirmPassword ? "reset-confirm-password-error" : undefined
          }
          onChange={(next) => {
            setConfirmPassword(next);
            if (errors.confirmPassword || next.length > 0) {
              setErrors((prev) => ({
                ...prev,
                confirmPassword: validateConfirmPassword(newPassword, next),
              }));
            }
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              confirmPassword: validateConfirmPassword(
                newPassword,
                confirmPassword
              ),
            }))
          }
        />
      </FormField>

      <div className="pt-1">
        <SubmitButton
          isLoading={isSubmitting}
          loadingText="Updating Password..."
        >
          Update Password &amp; Sign In
        </SubmitButton>
      </div>
    </form>
  );
}
