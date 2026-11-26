"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/auth/StatusBanner";
import {
  SecurityServiceError,
  securityService,
  type KycStatusResponse,
} from "@/services/security/securityService";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

export function SecurityOverview() {
  const [statusData, setStatusData] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await securityService.getKycStatus(signal);
      setStatusData(result);
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
    loadStatus(controller.signal);
    return () => controller.abort();
  }, [loadStatus]);

  return (
    <div className="space-y-6">
      {error && (
        <StatusBanner
          variant="error"
          message={error}
          action={
            <button
              type="button"
              onClick={() => loadStatus()}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-brand-ice/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-muted">
            Current Security Check Status
          </p>
          <p className="mt-0.5 text-sm font-semibold text-brand-ink">
            Complete both steps to verify your identity on Date².
          </p>
        </div>
        {loading ? (
          <span className="text-xs font-medium text-brand-muted">
            Checking status...
          </span>
        ) : (
          <VerificationStatusBadge
            status={statusData?.overallStatus ?? "NOT_STARTED"}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Step 1: Face Scan */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-border bg-white p-5 shadow-soft transition-colors hover:border-brand-mint">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-forest">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
                  <circle cx="12" cy="11" r="3" />
                  <path d="M8.5 17c1-1.6 6-1.6 7 0" />
                </svg>
              </span>
              <VerificationStatusBadge
                status={statusData?.faceScan.status ?? "NOT_STARTED"}
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-brand-ink">
                1. Face Scan Verification
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                Take a live photo using your camera so our verification service
                can confirm you are a real person.
              </p>
            </div>
          </div>

          <Link
            href="/security-check/face-scan"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-brand-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            {statusData?.faceScan.status === "SUBMITTED"
              ? "Review or Retake Face Scan"
              : "Start Face Scan"}
          </Link>
        </div>

        {/* Step 2: Government ID */}
        <div className="flex flex-col justify-between rounded-2xl border border-brand-border bg-white p-5 shadow-soft transition-colors hover:border-brand-mint">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ice text-brand-forest">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2.5" />
                  <path d="M7 9h4M7 13h10M7 16h6" />
                  <circle cx="15.5" cy="9" r="1.5" />
                </svg>
              </span>
              <VerificationStatusBadge
                status={
                  statusData?.documentVerification.status ?? "NOT_STARTED"
                }
              />
            </div>

            <div>
              <h2 className="text-base font-bold text-brand-ink">
                2. Government ID Verification
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-brand-muted">
                Select your issuing country and upload your passport, national
                ID, driver&apos;s license, Aadhaar, or PAN card.
              </p>
            </div>
          </div>

          <Link
            href="/security-check/document-verification"
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-brand-border bg-brand-ice/75 px-4 py-2.5 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            {statusData?.documentVerification.status === "SUBMITTED"
              ? "Update Document Submission"
              : "Verify Government ID"}
          </Link>
        </div>
      </div>

      {statusData?.overallStatus === "VERIFIED" && (
        <Link
          href="/onboarding/personal-info"
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
        >
          Continue to Personal Information
        </Link>
      )}

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-brand-border/80 bg-brand-canvas px-4 py-3.5 text-xs sm:flex-row">
        <span className="text-brand-muted">
          Already submitted your checks? Track live verification updates.
        </span>
        <Link
          href="/security-check/status"
          className="font-semibold text-brand-forest hover:text-brand-mintHover hover:underline"
        >
          View Verification Status →
        </Link>
      </div>
    </div>
  );
}
