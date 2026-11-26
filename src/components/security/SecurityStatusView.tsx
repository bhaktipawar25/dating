"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { SubmitButton } from "@/components/auth/SubmitButton";
import {
  isDevMockSimulationAllowed,
  simulateMockBackendKycApproval,
} from "@/services/security/mockSecurityService";
import {
  SecurityServiceError,
  securityService,
  type KycOverallStatus,
  type KycStatusResponse,
} from "@/services/security/securityService";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

const ALL_STATUS_STEPS: readonly {
  key: KycOverallStatus;
  title: string;
  description: string;
}[] = [
  {
    key: "NOT_STARTED",
    title: "Not Started",
    description: "Begin by completing your Face Scan and Government ID upload.",
  },
  {
    key: "CAMERA_PERMISSION_REQUIRED",
    title: "Camera Permission Required",
    description: "Grant webcam access when prompted to take your live face photo.",
  },
  {
    key: "FACE_SCAN_SUBMITTED",
    title: "Face Scan Submitted",
    description: "Your face photo has been sent for backend verification.",
  },
  {
    key: "DOCUMENT_SUBMITTED",
    title: "Document Submitted",
    description: "Your government ID files have been sent for backend verification.",
  },
  {
    key: "VERIFICATION_PENDING",
    title: "Verification Pending",
    description: "Both checks are submitted and awaiting backend review.",
  },
  {
    key: "VERIFIED",
    title: "Verified",
    description: "Identity verification is complete. You can continue to Personal Information.",
  },
  {
    key: "VERIFICATION_FAILED",
    title: "Verification Failed",
    description: "One or more checks failed and require resubmission.",
  },
];

export function SecurityStatusView() {
  const router = useRouter();
  const [statusData, setStatusData] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await securityService.getKycStatus(signal);
      setStatusData(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof SecurityServiceError
          ? err.message
          : "Unable to retrieve your verification status."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStatus(controller.signal);
    return () => controller.abort();
  }, [fetchStatus]);

  const handleSimulateApproval = async () => {
    if (isSimulating || loading) return;
    setIsSimulating(true);
    setError(null);
    try {
      const updated = await simulateMockBackendKycApproval();
      setStatusData(updated);
      await fetchStatus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to simulate verification approval."
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const currentOverall = statusData?.overallStatus ?? "NOT_STARTED";
  const isVerified = currentOverall === "VERIFIED";
  const canSimulateInDev =
    isDevMockSimulationAllowed() &&
    Boolean(statusData?.isMockResponse) &&
    currentOverall === "VERIFICATION_PENDING";

  return (
    <div className="space-y-6">
      {error && (
        <StatusBanner
          variant="error"
          message={error}
          action={
            <button
              type="button"
              onClick={() => fetchStatus()}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      {isVerified ? (
        <StatusBanner
          variant="success"
          title="Verification approved"
          message="Your Face Scan and Government ID verification are complete. Continue to Personal Information to set up your profile."
        />
      ) : (
        statusData?.isMockResponse && (
          <StatusBanner
            variant="info"
            message="Displaying local development test status. Connect the Date² backend service for real facial and government ID verification."
          />
        )
      )}

      {statusData?.failureReason && (
        <StatusBanner
          variant="error"
          title="Verification issue"
          message={statusData.failureReason}
        />
      )}

      {/* Overall Status Header Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-ice/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-brand-muted">
            Overall Verification Status
          </p>
          <p className="mt-1 text-base font-bold text-brand-ink">
            {loading
              ? "Loading current status..."
              : ALL_STATUS_STEPS.find((s) => s.key === currentOverall)?.title ??
                "Status"}
          </p>
          <p className="mt-0.5 text-xs text-brand-muted">
            {ALL_STATUS_STEPS.find((s) => s.key === currentOverall)
              ?.description ?? ""}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!loading && <VerificationStatusBadge status={currentOverall} />}
          <button
            type="button"
            disabled={loading || isSimulating}
            onClick={() => fetchStatus()}
            className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-forest transition-colors hover:bg-brand-frost disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Individual Check Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-border bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-brand-ink">Face Scan</h2>
            <VerificationStatusBadge
              status={statusData?.faceScan.status ?? "NOT_STARTED"}
            />
          </div>
          <p className="text-xs leading-relaxed text-brand-muted">
            {statusData?.faceScan.message ?? "No face scan submitted yet."}
          </p>
          {statusData?.faceScan.status !== "VERIFIED" && (
            <Link
              href="/security-check/face-scan"
              className="inline-flex text-xs font-semibold text-brand-forest hover:text-brand-mintHover hover:underline"
            >
              {statusData?.faceScan.status === "FAILED"
                ? "Retry Face Scan →"
                : "Go to Face Scan →"}
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-brand-ink">
              Government ID Document
            </h2>
            <VerificationStatusBadge
              status={statusData?.documentVerification.status ?? "NOT_STARTED"}
            />
          </div>
          <p className="text-xs leading-relaxed text-brand-muted">
            {statusData?.documentVerification.message ??
              "No identity document submitted yet."}
          </p>
          {statusData?.documentVerification.status !== "VERIFIED" && (
            <Link
              href="/security-check/document-verification"
              className="inline-flex text-xs font-semibold text-brand-forest hover:text-brand-mintHover hover:underline"
            >
              {statusData?.documentVerification.status === "FAILED"
                ? "Resubmit Document →"
                : "Go to Document Verification →"}
            </Link>
          )}
        </div>
      </div>

      {/* Development-Only Simulation Panel */}
      {canSimulateInDev && (
        <div className="rounded-2xl border border-brand-mint/70 bg-brand-ice/70 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-forest">
              Development Testing Controls
            </p>
            <p className="mt-0.5 text-xs text-brand-muted">
              Both checks are submitted. Simulate backend approval to mark Face
              Scan and Government ID as Verified and continue to Personal
              Information.
            </p>
          </div>
          <button
            type="button"
            disabled={isSimulating || loading}
            onClick={handleSimulateApproval}
            className="shrink-0 rounded-xl bg-brand-forest px-4 py-2.5 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSimulating ? "Simulating Approval..." : "Simulate Backend Approval"}
          </button>
        </div>
      )}

      {/* Status Reference List */}
      <div className="rounded-2xl border border-brand-border/80 bg-brand-canvas p-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          Verification Stages
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALL_STATUS_STEPS.map((step) => {
            const active = step.key === currentOverall;
            return (
              <div
                key={step.key}
                className={`rounded-xl border px-2.5 py-1.5 text-xs ${
                  active
                    ? "border-brand-forest bg-white font-semibold text-brand-ink shadow-sm"
                    : "border-brand-border/60 bg-white/50 text-brand-muted"
                }`}
              >
                {step.title}
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Navigation Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton
          type="button"
          variant="secondary"
          isLoading={loading}
          loadingText="Refreshing status..."
          onClick={() => fetchStatus()}
        >
          Refresh Verification Status
        </SubmitButton>

        <SubmitButton
          type="button"
          disabled={!isVerified || loading}
          onClick={() => router.push("/onboarding/personal-info")}
        >
          Continue to Personal Information
        </SubmitButton>
      </div>
    </div>
  );
}
