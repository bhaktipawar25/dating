"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_CONFIG } from "@/services/auth/endpoints";
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
  mode?: "verify" | "reset";
  createdNotice?: boolean;
}

const RESEND_COOLDOWN_SECONDS = 30;

function formatExpiry(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function VerifyEmailForm({
  initialEmail = "",
  mode = "verify",
  createdNotice = false,
}: VerifyEmailFormProps) {
  const router = useRouter();
  const isResetMode = mode === "reset";
  const purpose = isResetMode ? "password-reset" : "verify-email";

  const [email, setEmail] = useState(initialEmail);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [draftEmail, setDraftEmail] = useState(initialEmail);
  const [draftEmailError, setDraftEmailError] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(
    initialEmail ? RESEND_COOLDOWN_SECONDS : 0
  );
  const [demoOtpSnapshot, setDemoOtpSnapshot] = useState<{
    code: string;
    expiresAt: number;
  } | null>(null);
  const [demoRemainingSeconds, setDemoRemainingSeconds] = useState<number>(0);

  const [otpError, setOtpError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    variant: "error" | "success" | "info" | "warning";
    message: string;
  } | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isMockDev =
    AUTH_CONFIG.mode === "mock" && process.env.NODE_ENV !== "production";

  const refreshDemoSnapshot = React.useCallback(
    (targetEmail: string) => {
      if (!isMockDev || !targetEmail.trim()) {
        setDemoOtpSnapshot(null);
        return;
      }
      const snap = authService.getMockOtpSnapshot?.(targetEmail, purpose) ?? null;
      setDemoOtpSnapshot(snap);
      if (snap) {
        setDemoRemainingSeconds(
          Math.max(0, Math.ceil((snap.expiresAt - Date.now()) / 1000))
        );
      }
    },
    [isMockDev, purpose]
  );

  // Hydrate missing email from active mock session if user navigated directly
  useEffect(() => {
    if (email.trim()) {
      refreshDemoSnapshot(email);
      return;
    }

    let cancelled = false;
    authService
      .getSession()
      .then((session) => {
        if (!cancelled && session.user?.email) {
          setEmail(session.user.email);
          setDraftEmail(session.user.email);
          refreshDemoSnapshot(session.user.email);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [email, refreshDemoSnapshot]);

  // 30-second resend timer + mock OTP TTL display ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      if (demoOtpSnapshot) {
        setDemoRemainingSeconds(
          Math.max(
            0,
            Math.ceil((demoOtpSnapshot.expiresAt - Date.now()) / 1000)
          )
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [demoOtpSnapshot]);

  const handlePasteFromClipboard = async () => {
    if (!navigator?.clipboard?.readText) {
      setBanner({
        variant: "info",
        message: "Use Ctrl+V / Cmd+V in the first digit box to paste your 6-digit code.",
      });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (digits.length === 6) {
        setOtp(digits);
        setOtpError(null);
        setBanner({
          variant: "info",
          message: "6-digit code pasted from clipboard.",
        });
      } else {
        setBanner({
          variant: "warning",
          message: "No 6-digit code detected in clipboard.",
        });
      }
    } catch {
      setBanner({
        variant: "info",
        message: "Paste directly into the code boxes using Ctrl+V / Cmd+V.",
      });
    }
  };

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isVerifying || isResending) return;

    setBanner(null);
    const emailErr = validateEmail(email, "Email is required");
    if (emailErr) {
      setBanner({ variant: "error", message: emailErr });
      setEditModalOpen(true);
      return;
    }

    const nextOtpErr = validateOtpCode(otp);
    setOtpError(nextOtpErr);
    if (nextOtpErr) return;

    setIsVerifying(true);
    try {
      const response = await authService.verifyOtp({
        email: email.trim().toLowerCase(),
        otp,
        purpose,
      });

      if (isResetMode) {
        const token = response.resetToken ?? response.email;
        router.push(
          `/reset-password?email=${encodeURIComponent(
            response.email
          )}&token=${encodeURIComponent(token)}`
        );
      } else {
        router.push("/security-check");
      }
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
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending || isVerifying) return;
    setBanner(null);

    const emailErr = validateEmail(email, "Email is required");
    if (emailErr) {
      setEditModalOpen(true);
      return;
    }

    setIsResending(true);
    try {
      const response = await authService.sendOtp({
        email: email.trim().toLowerCase(),
        purpose: isResetMode ? "password-reset" : "resend",
      });
      setOtp("");
      setOtpError(null);
      setCountdown(response.cooldownSeconds ?? RESEND_COOLDOWN_SECONDS);
      refreshDemoSnapshot(response.email);
      setBanner({
        variant: "info",
        message: `New verification code issued to ${response.email}.`,
      });
    } catch (err) {
      setBanner({
        variant: "error",
        message:
          err instanceof AuthServiceError
            ? err.message
            : "Failed to resend verification code. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validateEmail(draftEmail, "Enter a valid email address");
    setDraftEmailError(err);
    if (err) return;

    const cleanNew = draftEmail.trim().toLowerCase();
    setIsResending(true);
    try {
      if (!isResetMode && authService.updateUnverifiedEmail) {
        await authService.updateUnverifiedEmail({
          currentEmail: email.trim().toLowerCase(),
          updatedEmail: cleanNew,
        });
      } else {
        await authService.sendOtp({
          email: cleanNew,
          purpose: isResetMode ? "password-reset" : "verify-email",
        });
      }

      setEmail(cleanNew);
      setEditModalOpen(false);
      setOtp("");
      setOtpError(null);
      setCountdown(RESEND_COOLDOWN_SECONDS);
      refreshDemoSnapshot(cleanNew);
      setBanner({
        variant: "info",
        message: `Updated recipient email and sent fresh code to ${cleanNew}.`,
      });
    } catch (error) {
      setDraftEmailError(
        error instanceof AuthServiceError
          ? error.message
          : "Could not update recipient email."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout failure in mock transition
    }
    router.push("/login");
  };

  return (
    <div className="space-y-5 font-helvetica">
      {createdNotice && !isResetMode && (
        <StatusBanner
          variant="success"
          message={
            isMockDev
              ? "Account created! Verify your email using the local Demo OTP below to proceed to Security Check."
              : "Account created! Enter your 6-digit email verification code below to proceed to Security Check."
          }
        />
      )}

      {banner && (
        <StatusBanner variant={banner.variant} message={banner.message} />
      )}

      {/* Recipient Email Display + Edit Email */}
      <div className="flex items-center justify-between gap-3 rounded-[14px] border border-date2-border bg-date2-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-date2-muted">
            Verification Target
          </p>
          <p className="truncate text-sm font-bold text-date2-ink">
            {email || "No email selected"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraftEmail(email);
            setDraftEmailError(null);
            setEditModalOpen(true);
          }}
          className="shrink-0 rounded-xl border border-date2-softBorder bg-date2-white px-3 py-1.5 text-xs font-bold text-date2-deepIndigo transition-colors hover:border-date2-violet hover:bg-date2-lavenderMist"
        >
          Edit Email
        </button>
      </div>

      {/* OTP Form */}
      <form onSubmit={handleVerify} noValidate className="space-y-4">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-charcoal">
              6-Digit Verification Code
            </span>
            <button
              type="button"
              onClick={() => void handlePasteFromClipboard()}
              className="inline-flex items-center gap-1 text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
            >
              Paste Code
            </button>
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
            <p role="alert" className="text-xs font-bold text-rose-600">
              {otpError}
            </p>
          )}
        </div>

        <SubmitButton isLoading={isVerifying} loadingText="Verifying...">
          {isResetMode ? "Verify Reset Code" : "Verify Email"}
        </SubmitButton>
      </form>

      {/* Resend Timer Row */}
      <div className="flex flex-col items-center justify-between gap-2 rounded-[14px] border border-date2-border bg-date2-canvas px-4 py-3 text-xs sm:flex-row">
        <span className="text-date2-slate">
          Didn&apos;t receive the code?
        </span>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={countdown > 0 || isResending || isVerifying}
          className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline disabled:cursor-not-allowed disabled:text-date2-muted disabled:no-underline"
        >
          {isResending
            ? "Sending..."
            : countdown > 0
              ? `Resend code in ${countdown}s`
              : "Resend Code"}
        </button>
      </div>

      {!isResetMode && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void handleSwitchAccount()}
            className="text-xs font-bold text-date2-muted transition-colors hover:text-date2-deepIndigo hover:underline"
          >
            Switch Account
          </button>
        </div>
      )}

      {/* Dev-Only Local Testing Helper mirroring Flutter's Demo OTP card (never rendered in API/prod) */}
      {isMockDev && demoOtpSnapshot && (
        <div className="rounded-[16px] border border-date2-paleLavender bg-date2-lavenderMist/60 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-date2-midnight">
              Demo OTP Code (Mock Testing Only):{" "}
              <code className="rounded bg-date2-white px-2 py-0.5 font-mono text-sm font-bold text-date2-deepIndigo">
                {demoOtpSnapshot.code}
              </code>
            </span>
            <span className="font-bold text-date2-deepIndigo">
              {demoRemainingSeconds > 0
                ? `Expires in ${formatExpiry(demoRemainingSeconds)}`
                : "Expired"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setOtp(demoOtpSnapshot.code);
                setOtpError(null);
              }}
              className="rounded-lg bg-date2-midnight px-3 py-1.5 text-xs font-bold text-date2-white transition-colors hover:bg-date2-deepIndigo"
            >
              Fill Demo OTP
            </button>
            <button
              type="button"
              onClick={() => {
                authService.expireMockOtp?.(email, purpose);
                refreshDemoSnapshot(email);
                setBanner({
                  variant: "warning",
                  message:
                    "Demo OTP marked expired. Submit to verify expiry handling or tap Resend Code.",
                });
              }}
              className="rounded-lg border border-date2-softBorder bg-date2-white px-3 py-1.5 text-xs font-bold text-date2-charcoal transition-colors hover:bg-date2-surface"
            >
              Expire OTP (Test)
            </button>
          </div>
        </div>
      )}

      {/* Edit Email Modal Dialog matching Flutter's Edit Email Address dialog */}
      {editModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-email-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-date2-ink/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-[22px] border border-date2-border bg-date2-white p-6 shadow-indigoCard">
            <h2
              id="edit-email-dialog-title"
              className="font-helvetica text-lg font-bold text-date2-ink"
            >
              Edit Email Address
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-date2-slate">
              Enter the corrected email address to receive a new 6-digit code.
            </p>

            <form
              onSubmit={(e) => void handleUpdateEmail(e)}
              noValidate
              className="mt-4 space-y-4"
            >
              <FormField
                id="modal-edit-email"
                label="New Email Address"
                required
                error={draftEmailError}
              >
                <input
                  id="modal-edit-email"
                  type="email"
                  value={draftEmail}
                  placeholder="your.name@example.com"
                  onChange={(e) => {
                    setDraftEmail(e.target.value);
                    if (draftEmailError) {
                      setDraftEmailError(
                        validateEmail(e.target.value, "Enter a valid email address")
                      );
                    }
                  }}
                  className="date2-input-base"
                />
              </FormField>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-[12px] border border-date2-softBorder bg-date2-white px-4 py-2.5 text-xs font-bold text-date2-charcoal hover:bg-date2-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResending}
                  className="rounded-[12px] bg-date2-midnight px-4 py-2.5 text-xs font-bold text-date2-white hover:bg-date2-deepIndigo disabled:opacity-60"
                >
                  {isResending ? "Updating..." : "Update & Resend"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
