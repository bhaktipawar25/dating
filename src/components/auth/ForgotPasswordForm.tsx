"use client";

import React, { useState } from "react";
import { AuthServiceError, authService } from "@/services/auth/authService";
import { validateEmail } from "@/lib/validation/authValidation";
import { FormField } from "./FormField";
import { StatusBanner } from "./StatusBanner";
import { SubmitButton } from "./SubmitButton";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    email: string;
    mockResetToken?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword({
        email: email.trim(),
      });
      setConfirmation(response);
    } catch (error) {
      if (error instanceof AuthServiceError) {
        setFormError(error.message);
      } else {
        setFormError(
          "Unable to send reset instructions right now. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="space-y-5">
        <StatusBanner
          variant="success"
          title="Check your inbox"
          message={confirmation.message}
        />

        <div className="rounded-2xl border border-brand-border bg-brand-ice/70 p-4 text-sm text-brand-ink">
          <p className="text-xs font-medium text-brand-muted">
            Instructions requested for
          </p>
          <p className="mt-0.5 font-semibold">{confirmation.email}</p>
        </div>

        <SubmitButton
          type="button"
          variant="secondary"
          onClick={() => {
            setConfirmation(null);
            setFormError(null);
          }}
        >
          Try another email address
        </SubmitButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && <StatusBanner variant="error" message={formError} />}

      <FormField
        id="forgot-email"
        label="Email address"
        required
        error={emailError}
        hint="Enter the email address associated with your account."
      >
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="alex@example.com"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(emailError)}
          aria-describedby={
            emailError ? "forgot-email-error" : "forgot-email-hint"
          }
          onChange={(e) => {
            const next = e.target.value;
            setEmail(next);
            if (emailError) setEmailError(validateEmail(next));
          }}
          onBlur={() => setEmailError(validateEmail(email))}
          className={`auth-input-base ${
            emailError
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : ""
          }`}
        />
      </FormField>

      <SubmitButton
        isLoading={isSubmitting}
        loadingText="Sending instructions..."
      >
        Send reset instructions
      </SubmitButton>
    </form>
  );
}
