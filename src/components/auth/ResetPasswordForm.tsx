"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AuthServiceError,
  authService,
} from "@/services/auth/authService";
import {
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
}

export function ResetPasswordForm({
  initialToken = "",
}: ResetPasswordFormProps) {
  const [token, setToken] = useState(initialToken);
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

  const validateAll = (): boolean => {
    const tokenError = token.trim()
      ? null
      : "A password reset token is required.";
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
        setFormError("Unable to reset password right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isResetDone) {
    return (
      <div className="space-y-5">
        <StatusBanner
          variant="success"
          title="Password updated"
          message={successMessage}
        />
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <StatusBanner variant="error" message={formError} />}

      {!initialToken && (
        <FormField
          id="reset-token"
          label="Reset token"
          required
          error={errors.token}
          hint="Paste the token from your password reset email link."
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
                    : "A password reset token is required.",
                }));
              }
            }}
            className={`auth-input-base ${
              errors.token
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
                : ""
            }`}
          />
        </FormField>
      )}

      <FormField
        id="reset-new-password"
        label="New password"
        required
        error={errors.newPassword}
      >
        <PasswordInput
          id="reset-new-password"
          name="newPassword"
          value={newPassword}
          autoComplete="new-password"
          placeholder="Create a strong new password"
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
        label="Confirm new password"
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
        <SubmitButton isLoading={isSubmitting} loadingText="Updating password...">
          Reset password
        </SubmitButton>
      </div>
    </form>
  );
}
