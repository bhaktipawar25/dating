"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthServiceError, authService } from "@/services/auth/authService";
import { validateEmail } from "@/lib/validation/authValidation";
import { FormField } from "./FormField";
import { StatusBanner } from "./StatusBanner";
import { SubmitButton } from "./SubmitButton";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    const err = validateEmail(email, "Please enter your registered email");
    setEmailError(err);
    if (err) return;

    const cleanEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    try {
      await authService.forgotPassword({ email: cleanEmail });
      router.push(
        `/verify-email?mode=reset&email=${encodeURIComponent(cleanEmail)}`
      );
    } catch (error) {
      if (error instanceof AuthServiceError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to dispatch code. Verify email or try again.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 font-helvetica">
      {formError && <StatusBanner variant="error" message={formError} />}

      <FormField
        id="forgot-email"
        label="Registered Email"
        required
        error={emailError}
      >
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your.name@example.com"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? "forgot-email-error" : undefined}
          onChange={(e) => {
            const next = e.target.value;
            setEmail(next);
            if (emailError) {
              setEmailError(
                validateEmail(next, "Please enter your registered email")
              );
            }
          }}
          onBlur={() =>
            setEmailError(
              validateEmail(email, "Please enter your registered email")
            )
          }
          className={`date2-input-base ${
            emailError
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : ""
          }`}
        />
      </FormField>

      <SubmitButton isLoading={isSubmitting} loadingText="Sending Code...">
        Send Verification Code
      </SubmitButton>
    </form>
  );
}
