"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthServiceError, authService } from "@/services/auth/authService";
import {
  validateConfirmPassword,
  validateEmail,
  validateStrongPassword,
  validateUsername,
} from "@/lib/validation/authValidation";
import { FormField } from "./FormField";
import { PasswordInput } from "./PasswordInput";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { StatusBanner } from "./StatusBanner";
import { SubmitButton } from "./SubmitButton";

type UsernameAvailability =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; message: string }
  | { status: "taken"; message: string }
  | { status: "error"; message: string };

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    username?: string | null;
    email?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
  }>({});
  const [availability, setAvailability] = useState<UsernameAvailability>({
    status: "idle",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = username.trim();
    const formatError = validateUsername(trimmed);

    abortControllerRef.current?.abort();

    if (!trimmed || formatError) {
      setAvailability({ status: "idle" });
      return;
    }

    setAvailability({ status: "checking" });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const result = await authService.checkUsername(
          trimmed,
          controller.signal
        );
        if (controller.signal.aborted) return;

        if (result.available) {
          setAvailability({
            status: "available",
            message: result.message ?? "Username is available.",
          });
        } else {
          setAvailability({
            status: "taken",
            message: result.message ?? "This username is already taken.",
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setAvailability({
          status: "error",
          message: "Could not verify username availability right now.",
        });
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  const validateAll = (): boolean => {
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    const passwordError = validateStrongPassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);

    setErrors({
      username: usernameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmError,
    });

    return (
      !usernameError && !emailError && !passwordError && !confirmError
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    if (!validateAll()) {
      return;
    }

    if (availability.status === "taken") {
      setErrors((prev) => ({
        ...prev,
        username: availability.message,
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure username availability was confirmed before registering
      if (availability.status === "idle" || availability.status === "checking") {
        const check = await authService.checkUsername(username.trim());
        if (!check.available) {
          const takenMsg = check.message ?? "This username is already taken.";
          setAvailability({ status: "taken", message: takenMsg });
          setErrors((prev) => ({ ...prev, username: takenMsg }));
          setIsSubmitting(false);
          return;
        }
        setAvailability({
          status: "available",
          message: check.message ?? "Username is available.",
        });
      }

      const result = await authService.register({
        username: username.trim(),
        email: email.trim(),
        password,
      });

      const targetEmail = encodeURIComponent(result.email || email.trim());
      router.push(`/verify-email?email=${targetEmail}`);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setFormError(err.message);
        if (err.fieldErrors) {
          setErrors((prev) => ({
            ...prev,
            username: err.fieldErrors?.username ?? prev.username,
            email: err.fieldErrors?.email ?? prev.email,
            password: err.fieldErrors?.password ?? prev.password,
          }));
        }
      } else {
        setFormError("Unable to create your account. Please try again.");
      }
      setIsSubmitting(false);
    }
  };

  const renderAvailabilityBadge = () => {
    if (errors.username) return null;

    if (availability.status === "checking") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-muted">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-brand-mint border-t-transparent"
          />
          Checking...
        </span>
      );
    }

    if (availability.status === "available") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-ice px-2 py-0.5 text-xs font-semibold text-brand-forest">
          ✓ Available
        </span>
      );
    }

    if (availability.status === "taken") {
      return (
        <span className="text-xs font-semibold text-rose-600">
          Already taken
        </span>
      );
    }

    return null;
  };

  const usernameErrorText =
    errors.username ??
    (availability.status === "taken" ? availability.message : null);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && <StatusBanner variant="error" message={formError} />}

      <FormField
        id="register-username"
        label="Username"
        required
        error={usernameErrorText}
        hint={
          availability.status === "error"
            ? availability.message
            : "3–20 characters. Start with a letter; letters, numbers, and underscores only."
        }
        rightAccessory={renderAvailabilityBadge()}
      >
        <input
          id="register-username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="alex_morgan"
          value={username}
          disabled={isSubmitting}
          aria-invalid={Boolean(usernameErrorText)}
          aria-describedby={
            usernameErrorText
              ? "register-username-error"
              : "register-username-hint"
          }
          onChange={(e) => {
            const next = e.target.value;
            setUsername(next);
            if (errors.username) {
              setErrors((prev) => ({
                ...prev,
                username: validateUsername(next),
              }));
            }
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              username: validateUsername(username),
            }))
          }
          className={`auth-input-base ${
            usernameErrorText
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : availability.status === "available"
                ? "border-brand-mint"
                : ""
          }`}
        />
      </FormField>

      <FormField
        id="register-email"
        label="Email address"
        required
        error={errors.email}
        hint="We will send a 6-digit SMTP verification code to this address."
      >
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="alex@example.com"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={
            errors.email ? "register-email-error" : "register-email-hint"
          }
          onChange={(e) => {
            const next = e.target.value;
            setEmail(next);
            if (errors.email) {
              setErrors((prev) => ({ ...prev, email: validateEmail(next) }));
            }
          }}
          onBlur={() =>
            setErrors((prev) => ({ ...prev, email: validateEmail(email) }))
          }
          className={`auth-input-base ${
            errors.email
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : ""
          }`}
        />
      </FormField>

      <FormField
        id="register-password"
        label="Password"
        required
        error={errors.password}
      >
        <PasswordInput
          id="register-password"
          name="password"
          value={password}
          autoComplete="new-password"
          placeholder="Create a strong password"
          disabled={isSubmitting}
          hasError={Boolean(errors.password)}
          describedBy={errors.password ? "register-password-error" : undefined}
          onChange={(next) => {
            setPassword(next);
            setErrors((prev) => ({
              ...prev,
              password: prev.password ? validateStrongPassword(next) : null,
              confirmPassword: confirmPassword
                ? validateConfirmPassword(next, confirmPassword)
                : prev.confirmPassword,
            }));
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              password: validateStrongPassword(password),
            }))
          }
        />
        <PasswordStrengthMeter password={password} />
      </FormField>

      <FormField
        id="register-confirm-password"
        label="Confirm password"
        required
        error={errors.confirmPassword}
      >
        <PasswordInput
          id="register-confirm-password"
          name="confirmPassword"
          value={confirmPassword}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          disabled={isSubmitting}
          hasError={Boolean(errors.confirmPassword)}
          describedBy={
            errors.confirmPassword
              ? "register-confirm-password-error"
              : undefined
          }
          onChange={(next) => {
            setConfirmPassword(next);
            if (errors.confirmPassword || next.length > 0) {
              setErrors((prev) => ({
                ...prev,
                confirmPassword: validateConfirmPassword(password, next),
              }));
            }
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              confirmPassword: validateConfirmPassword(
                password,
                confirmPassword
              ),
            }))
          }
        />
      </FormField>

      <div className="pt-1">
        <SubmitButton
          isLoading={isSubmitting}
          loadingText="Creating account..."
        >
          Create account
        </SubmitButton>
      </div>
    </form>
  );
}
