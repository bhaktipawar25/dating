"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AuthServiceError, authService } from "@/services/auth/authService";
import {
  validateEmail,
  validateOtpCode,
} from "@/lib/validation/authValidation";
import { FormField } from "./FormField";
import { OtpInputGroup } from "./OtpInputGroup";
import { StatusBanner } from "./StatusBanner";
import { SubmitButton } from "./SubmitButton";

interface VerifyEmailFormProps {
  initialEmail?: string;
}

const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VerifyEmailForm({ initialEmail = "" }: VerifyEmailFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [editingEmail, setEditingEmail] = useState(!initialEmail);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(
    initialEmail ? RESEND_COOLDOWN_SECONDS : 0
  );

  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    variant: "error" | "success" | "info";
    message: string;
  } | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isVerifying || isResending) return;

    setBanner(null);
    const nextEmailErr = validateEmail(email);
    const nextOtpErr = validateOtpCode(otp);
    setEmailError(nextEmailErr);
    setOtpError(nextOtpErr);

    if (nextEmailErr || nextOtpErr) {
      if (nextEmailErr) setEditingEmail(true);
      return;
    }

    setIsVerifying(true);
    try {
      const response = await authService.verifyOtp({
        email: email.trim(),
        otp,
      });
      setIsVerified(true);
      setBanner({
        variant: "success",
        message: response.message,
      });
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setOtpError(err.message);
        setBanner({ variant: "error", message: err.message });
      } else {
        setBanner({
          variant: "error",
          message: "Unable to verify code right now. Please try again.",
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending || isVerifying) return;

    setBanner(null);
    const nextEmailErr = validateEmail(email);
    setEmailError(nextEmailErr);
    if (nextEmailErr) {
      setEditingEmail(true);
      return;
    }

    setIsResending(true);
    try {
      const response = await authService.sendOtp({
        email: email.trim(),
        purpose: "resend",
      });
      setEditingEmail(false);
      setOtp("");
      setOtpError(null);
      setCountdown(response.cooldownSeconds ?? RESEND_COOLDOWN_SECONDS);
      setBanner({
        variant: "info",
        message: `A new 6-digit verification code was sent to ${response.email}.`,
      });
    } catch (err) {
      if (err instanceof AuthServiceError) {
        setBanner({ variant: "error", message: err.message });
      } else {
        setBanner({
          variant: "error",
          message: "Failed to resend verification email. Please try again.",
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    const loginUrl = `/login?verified=1&email=${encodeURIComponent(
      email.trim()
    )}`;

    return (
      <div className="space-y-5">
        <StatusBanner
          variant="success"
          title="Email verified"
          message={
            banner?.message ??
            `${email.trim()} has been verified successfully.`
          }
        />

        <div className="space-y-3">
          <Link
            href="/security-check"
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            Continue to Security Check
          </Link>

          <Link
            href={loginUrl}
            className="inline-flex w-full items-center justify-center rounded-xl border border-brand-border bg-brand-ice/70 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            Continue to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} noValidate className="space-y-5">
      {banner && <StatusBanner variant={banner.variant} message={banner.message} />}

      {/* Recipient Email Display / Edit */}
      <div className="rounded-2xl border border-brand-border bg-brand-ice/70 p-4">
        {editingEmail ? (
          <FormField
            id="verify-email-input"
            label="Verification email"
            required
            error={emailError}
            rightAccessory={
              email && !validateEmail(email) ? (
                <button
                  type="button"
                  onClick={() => {
                    setEmailError(null);
                    setEditingEmail(false);
                  }}
                  className="text-xs font-semibold text-brand-forest hover:underline"
                >
                  Done
                </button>
              ) : null
            }
          >
            <input
              id="verify-email-input"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="alex@example.com"
              value={email}
              disabled={isVerifying || isResending}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(validateEmail(e.target.value));
              }}
              className="auth-input-base"
            />
          </FormField>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-brand-muted">
                Sending verification code to
              </p>
              <p className="truncate text-sm font-semibold text-brand-ink">
                {email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingEmail(true)}
              className="shrink-0 rounded-lg border border-brand-border bg-white px-2.5 py-1 text-xs font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {/* 6-digit OTP Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-brand-ink">
            6-digit verification code
          </span>
          <span className="text-xs text-brand-muted">Paste supported</span>
        </div>

        <OtpInputGroup
          value={otp}
          onChange={(next) => {
            setOtp(next);
            if (otpError) setOtpError(null);
          }}
          disabled={isVerifying}
          hasError={Boolean(otpError)}
        />

        {otpError && (
          <p role="alert" className="text-xs font-medium text-rose-600">
            {otpError}
          </p>
        )}
      </div>

      <SubmitButton isLoading={isVerifying} loadingText="Verifying code...">
        Verify OTP
      </SubmitButton>

      {/* Resend Timer & Button */}
      <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-brand-border/70 bg-brand-canvas px-4 py-3 text-xs sm:flex-row">
        <span className="text-brand-muted">
          Didn&apos;t receive the email? Check spam or request another.
        </span>
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || isResending || isVerifying}
          className="shrink-0 font-semibold text-brand-forest transition-colors hover:text-brand-mintHover hover:underline disabled:cursor-not-allowed disabled:text-brand-muted disabled:no-underline"
        >
          {isResending
            ? "Sending..."
            : countdown > 0
              ? `Resend in ${formatCountdown(countdown)}`
              : "Resend OTP"}
        </button>
      </div>
    </form>
  );
}
