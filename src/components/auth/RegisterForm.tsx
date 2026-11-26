"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { AuthServiceError, authService } from "@/services/auth/authService";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  normalizeUsername,
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState<{
    username?: string | null;
    email?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
    terms?: string | null;
  }>({});
  const [availability, setAvailability] = useState<UsernameAvailability>({
    status: "idle",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const runAvailabilityCheck = useCallback(async (rawUsername: string) => {
    const clean = normalizeUsername(rawUsername);
    const formatError = validateUsername(clean);

    abortControllerRef.current?.abort();

    if (!clean || formatError) {
      setAvailability({ status: "idle" });
      return;
    }

    setAvailability({ status: "checking" });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await authService.checkUsername(clean, controller.signal);
      if (controller.signal.aborted) return;

      if (result.available) {
        setAvailability({
          status: "available",
          message: "✓ Username available",
        });
      } else {
        setAvailability({
          status: "taken",
          message: "✗ Username already taken. Try another.",
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setAvailability({
        status: "error",
        message: "Network error checking handle. Tap retry.",
      });
    }
  }, []);

  useEffect(() => {
    const clean = normalizeUsername(username);
    const formatError = validateUsername(clean);

    abortControllerRef.current?.abort();

    if (!clean || formatError) {
      setAvailability({ status: "idle" });
      return;
    }

    setAvailability({ status: "checking" });
    const timer = setTimeout(() => {
      void runAvailabilityCheck(username);
    }, 350);

    return () => {
      clearTimeout(timer);
      abortControllerRef.current?.abort();
    };
  }, [username, runAvailabilityCheck]);

  const validateAll = (): boolean => {
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email, "Email is required");
    const passwordError = validateStrongPassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);
    const termsError = acceptedTerms
      ? null
      : "Please accept the Terms of Service & Affirming Guidelines.";

    setErrors({
      username: usernameError,
      email: emailError,
      password: passwordError,
      confirmPassword: confirmError,
      terms: termsError,
    });

    return (
      !usernameError &&
      !emailError &&
      !passwordError &&
      !confirmError &&
      !termsError
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    if (!validateAll()) {
      return;
    }

    const cleanUsername = normalizeUsername(username);
    const cleanEmail = email.trim().toLowerCase();

    if (availability.status === "taken") {
      setErrors((prev) => ({
        ...prev,
        username: availability.message,
      }));
      return;
    }

    setIsSubmitting(true);
    try {
      if (availability.status === "idle" || availability.status === "checking") {
        const check = await authService.checkUsername(cleanUsername);
        if (!check.available) {
          const takenMsg = "✗ Username already taken. Try another.";
          setAvailability({ status: "taken", message: takenMsg });
          setErrors((prev) => ({ ...prev, username: takenMsg }));
          setIsSubmitting(false);
          return;
        }
        setAvailability({
          status: "available",
          message: "✓ Username available",
        });
      }

      const result = await authService.register({
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      const targetEmail = encodeURIComponent(result.email || cleanEmail);
      router.push(`/verify-email?email=${targetEmail}&created=1`);
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

  const normalized = normalizeUsername(username);
  const showNormalizedPreview =
    username.trim().length > 0 && normalized !== username.trim();

  const renderUsernameAccessory = () => {
    if (errors.username) return null;

    if (availability.status === "checking") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-date2-slate">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-date2-indigo border-t-transparent"
          />
          Checking availability...
        </span>
      );
    }

    if (availability.status === "available") {
      return (
        <span className="rounded-full bg-date2-lavenderMist px-2.5 py-0.5 text-xs font-bold text-date2-deepIndigo">
          ✓ Username available
        </span>
      );
    }

    if (availability.status === "taken") {
      return (
        <span className="text-xs font-bold text-rose-600">Already taken</span>
      );
    }

    if (availability.status === "error") {
      return (
        <button
          type="button"
          onClick={() => void runAvailabilityCheck(username)}
          className="text-xs font-bold text-date2-deepIndigo underline hover:text-date2-violet"
        >
          Retry
        </button>
      );
    }

    return null;
  };

  const usernameErrorText =
    errors.username ??
    (availability.status === "taken" ? availability.message : null);

  const showMockNotice =
    AUTH_CONFIG.mode === "mock" && process.env.NODE_ENV !== "production";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 font-helvetica">
      {showMockNotice && (
        <StatusBanner
          variant="info"
          message="Frontend Demo Mode: Accounts use mock local auth until backend endpoints go live."
        />
      )}

      {formError && <StatusBanner variant="error" message={formError} />}

      <FormField
        id="register-username"
        label="Username"
        required
        error={usernameErrorText}
        hint={
          availability.status === "error"
            ? availability.message
            : `${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} chars: lowercase letters, numbers & _`
        }
        rightAccessory={renderUsernameAccessory()}
      >
        <input
          id="register-username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="e.g. ananya_24"
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
          className={`date2-input-base ${
            usernameErrorText
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : availability.status === "available"
                ? "border-date2-indigo"
                : ""
          }`}
        />

        {showNormalizedPreview && !usernameErrorText && (
          <p className="pt-1 text-xs font-bold text-date2-deepIndigo">
            Normalized: @{normalized}
          </p>
        )}
      </FormField>

      <FormField
        id="register-email"
        label="Email Address"
        required
        error={errors.email}
      >
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your.name@example.com"
          value={email}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          onChange={(e) => {
            const next = e.target.value;
            setEmail(next);
            if (errors.email) {
              setErrors((prev) => ({
                ...prev,
                email: validateEmail(next, "Email is required"),
              }));
            }
          }}
          onBlur={() =>
            setErrors((prev) => ({
              ...prev,
              email: validateEmail(email, "Email is required"),
            }))
          }
          className={`date2-input-base ${
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
          placeholder="Enter a strong password"
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
        label="Confirm Password"
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

      {/* Terms Acceptance Checkbox matching Flutter */}
      <div className="space-y-1 pt-1">
        <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-date2-border bg-date2-canvas px-3.5 py-3 text-xs leading-relaxed text-date2-charcoal">
          <input
            type="checkbox"
            checked={acceptedTerms}
            disabled={isSubmitting}
            onChange={(e) => {
              const checked = e.target.checked;
              setAcceptedTerms(checked);
              if (checked && errors.terms) {
                setErrors((prev) => ({ ...prev, terms: null }));
              }
            }}
            className="mt-0.5 h-4 w-4 rounded border-date2-softBorder text-date2-midnight focus:ring-date2-violet"
          />
          <span>I accept the Terms of Service &amp; Affirming Guidelines.</span>
        </label>
        {errors.terms && (
          <p role="alert" className="text-xs font-bold text-rose-600">
            {errors.terms}
          </p>
        )}
      </div>

      <div className="pt-1">
        <SubmitButton
          isLoading={isSubmitting}
          loadingText="Creating Account..."
        >
          Create Account
        </SubmitButton>
      </div>
    </form>
  );
}
