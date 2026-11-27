"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/auth/StatusBanner";
import {
  STORAGE_KEYS,
  getSecurityProgress,
  subscribeToStorageKey,
  updateSecurityProgress,
  type SecurityStepKey,
} from "@/lib/storage/localStorageManager";
import { authService } from "@/services/auth/authService";
import {
  SecurityServiceError,
  securityService,
  type KycStatusResponse,
} from "@/services/security/securityService";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

export function SecurityOverview() {
  const [statusData, setStatusData] = useState<KycStatusResponse | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacyNoticeExpanded, setPrivacyNoticeExpanded] = useState(true);
  const [lastVisitedStep, setLastVisitedStep] =
    useState<SecurityStepKey>("overview");

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [kycResult, sessionResult] = await Promise.all([
        securityService.getKycStatus(signal),
        authService.getSession(signal).catch(() => null),
      ]);
      setStatusData(kycResult);
      if (sessionResult?.user?.email) {
        setUserEmail(sessionResult.user.email);
        setEmailVerified(Boolean(sessionResult.user.emailVerified));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof SecurityServiceError
          ? err.message
          : "Unable to load your verification progress."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadStatus(controller.signal);

    const saved = getSecurityProgress();
    setPrivacyNoticeExpanded(saved.privacyNoticeExpanded);
    setLastVisitedStep(saved.lastVisitedStep);
    updateSecurityProgress({ visitedSteps: ["overview"] });

    const unsub = subscribeToStorageKey(STORAGE_KEYS.SECURITY_PROGRESS, () => {
      const next = getSecurityProgress();
      setPrivacyNoticeExpanded(next.privacyNoticeExpanded);
      setLastVisitedStep(next.lastVisitedStep);
    });

    return () => {
      controller.abort();
      unsub();
    };
  }, [loadStatus]);

  const faceStatus = statusData?.faceScan.status ?? "NOT_STARTED";
  const docStatus = statusData?.documentVerification.status ?? "NOT_STARTED";
  const overallStatus = statusData?.overallStatus ?? "NOT_STARTED";

  const isFaceDone =
    faceStatus === "SUBMITTED" ||
    faceStatus === "PENDING" ||
    faceStatus === "VERIFIED";
  const isDocDone =
    docStatus === "SUBMITTED" ||
    docStatus === "PENDING" ||
    docStatus === "VERIFIED";

  const completedStepsCount =
    (emailVerified ? 1 : 0) + (isFaceDone ? 2 : 0) + (isDocDone ? 1 : 0);
  const progressPercent = Math.round((completedStepsCount / 4) * 100);

  const steps = [
    {
      num: "1",
      title: "Email Address Verified",
      subtitle: userEmail || "Verified email address",
      completed: emailVerified,
      href: "/verify-email",
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      ),
    },
    {
      num: "2",
      title: "Live Webcam Face Scan",
      subtitle:
        "Browser getUserMedia webcam oval alignment with distance and lighting checks.",
      completed: isFaceDone,
      href: "/security-check/face-scan",
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
          <circle cx="12" cy="11" r="3" />
          <path d="M8.5 17c1-1.6 6-1.6 7 0" />
        </svg>
      ),
    },
    {
      num: "3",
      title: "Active Liveness Detection",
      subtitle:
        "Guided liveness prompts (blink twice, turn head ~15° left/right).",
      completed: isFaceDone,
      href: "/security-check/face-scan",
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      ),
    },
    {
      num: "4",
      title: "Government ID Verification",
      subtitle:
        "Country-aware document selection, webcam capture or PDF/image upload.",
      completed: isDocDone,
      href: "/security-check/document-verification",
      icon: (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-5 w-5"
        >
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M7 9h4M7 13h10M7 16h6" />
          <circle cx="15.5" cy="9" r="1.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-helvetica">
      {error && (
        <StatusBanner
          variant="error"
          message={error}
          action={
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="text-xs font-bold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      {/* Flutter Identity Assurance Header Card */}
      <div className="rounded-[20px] bg-gradient-to-br from-date2-midnight via-date2-deepIndigo to-date2-violet p-6 text-date2-white shadow-indigoSoft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-date2-white/15 text-date2-limeMark">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-6 w-6"
              >
                <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
                <path d="m9.5 12 2 2 3.5-4" />
              </svg>
            </span>
            <h2 className="text-lg font-bold tracking-tight text-date2-white">
              Identity Assurance
            </h2>
          </div>

          {loading ? (
            <span className="rounded-full bg-date2-white/15 px-3 py-1 text-xs font-bold text-date2-paleLavender">
              Checking status...
            </span>
          ) : (
            <VerificationStatusBadge status={overallStatus} />
          )}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-date2-paleLavender">
          Date² is an affirming, verified community. Complete the live face
          scan, active liveness check, and Government ID verification before
          unlocking Personal Info.
        </p>
      </div>

      {/* Verification Pipeline Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
          <span>Verification Pipeline</span>
          <span>{progressPercent}% Done</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-date2-lavenderMist"
        >
          <div
            className="h-full rounded-full bg-date2-violet transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 4 Verification Steps matching Flutter */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {steps.map((step) => (
          <Link
            key={step.num}
            href={step.href}
            className={`flex items-start gap-3.5 rounded-[16px] border p-4 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender ${
              step.completed
                ? "border-date2-indigo/50 bg-date2-lavenderMist/60"
                : "border-date2-border bg-date2-white hover:border-date2-lightPeriwinkle hover:bg-date2-canvas"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                step.completed
                  ? "bg-date2-midnight text-date2-limeMark"
                  : "bg-date2-lavenderMist text-date2-deepIndigo"
              }`}
            >
              {step.completed ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step.icon
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-date2-ink">
                  {step.num}. {step.title}
                </p>
                {step.completed && (
                  <span className="text-xs font-bold text-date2-deepIndigo">
                    ✓
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-date2-slate">
                {step.subtitle}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Strict Biometric Privacy & Camera Permission Card matching Flutter */}
      <div className="rounded-[16px] border border-date2-border bg-date2-surface p-4 text-xs">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-date2-ink">
            Strict Biometric Privacy &amp; Camera Notice
          </p>
          <button
            type="button"
            aria-expanded={privacyNoticeExpanded}
            onClick={() => {
              const next = !privacyNoticeExpanded;
              setPrivacyNoticeExpanded(next);
              updateSecurityProgress({ privacyNoticeExpanded: next });
            }}
            className="text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
          >
            {privacyNoticeExpanded ? "Hide details" : "Show details"}
          </button>
        </div>

        {privacyNoticeExpanded && (
          <div className="mt-3 divide-y divide-date2-border border-t border-date2-border pt-3">
            <div className="flex items-start gap-3 pb-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-date2-white text-date2-deepIndigo">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
                </svg>
              </span>
              <div>
                <p className="font-bold text-date2-ink">
                  Strict Biometric Privacy
                </p>
                <p className="mt-0.5 leading-relaxed text-date2-slate">
                  Camera frames are processed strictly in memory and never saved
                  to your browser storage or permanent gallery. Backend uploads
                  require transient verification over HTTPS without saving raw
                  selfies permanently.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-date2-white text-date2-violet">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
              <div>
                <p className="font-bold text-date2-ink">
                  Camera Permission Needed Next
                </p>
                <p className="mt-0.5 leading-relaxed text-date2-slate">
                  On the next screen, we request camera access exclusively for
                  guided face scan and Government ID framing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {lastVisitedStep !== "overview" && overallStatus !== "VERIFIED" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-date2-paleLavender bg-date2-lavenderMist/60 px-4 py-2.5 text-xs">
          <span className="font-bold text-date2-midnight">
            Last viewed verification screen:{" "}
            {lastVisitedStep === "face-scan"
              ? "Live Face Scan"
              : lastVisitedStep === "document-verification"
                ? "Government ID Document"
                : "Verification Status"}
          </span>
          <Link
            href={
              lastVisitedStep === "face-scan"
                ? "/security-check/face-scan"
                : lastVisitedStep === "document-verification"
                  ? "/security-check/document-verification"
                  : "/security-check/status"
            }
            className="font-bold text-date2-deepIndigo underline underline-offset-2 hover:text-date2-violet"
          >
            Resume screen →
          </Link>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="space-y-3">
        {overallStatus === "VERIFIED" ? (
          <Link
            href="/onboarding/personal-info"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-date2-midnight px-5 py-3 text-center font-helvetica text-[15px] font-bold leading-snug text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            Continue to Personal Information
          </Link>
        ) : isFaceDone && !isDocDone ? (
          <Link
            href="/security-check/document-verification"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-date2-midnight px-5 py-3 text-center font-helvetica text-[15px] font-bold leading-snug text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            Continue to Government ID
          </Link>
        ) : isFaceDone && isDocDone ? (
          <Link
            href="/security-check/status"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-date2-midnight px-5 py-3 text-center font-helvetica text-[15px] font-bold leading-snug text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            View Verification Status
          </Link>
        ) : (
          <Link
            href="/security-check/face-scan"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[14px] bg-date2-midnight px-5 py-3 text-center font-helvetica text-[15px] font-bold leading-snug text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            Start Live Face Scan
          </Link>
        )}

        <div className="flex flex-col items-center justify-between gap-2 rounded-[14px] border border-date2-border bg-date2-canvas px-4 py-3 text-xs sm:flex-row">
          <span className="text-date2-slate">
            Already submitted your checks? Track live verification updates.
          </span>
          <Link
            href="/security-check/status"
            className="font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
          >
            View Verification Status →
          </Link>
        </div>
      </div>
    </div>
  );
}
