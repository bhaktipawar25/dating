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
  STORAGE_KEYS,
  getSecurityProgress,
  subscribeToStorageKey,
  updateSecurityProgress,
} from "@/lib/storage/localStorageManager";
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
    description:
      "Begin by completing your Face Scan and Government ID verification.",
  },
  {
    key: "CAMERA_PERMISSION_REQUIRED",
    title: "Camera Permission Required",
    description:
      "Grant webcam access when prompted to take your live face photo.",
  },
  {
    key: "FACE_SCAN_SUBMITTED",
    title: "Face Scan Submitted",
    description: "Your face photo has been sent for backend verification.",
  },
  {
    key: "DOCUMENT_SUBMITTED",
    title: "Document Submitted",
    description:
      "Your government ID files have been sent for backend verification.",
  },
  {
    key: "VERIFICATION_PENDING",
    title: "Verification Pending",
    description: "Both checks are submitted and awaiting backend review.",
  },
  {
    key: "VERIFIED",
    title: "Verified",
    description:
      "Identity verification is complete. You can continue to Personal Information.",
  },
  {
    key: "VERIFICATION_FAILED",
    title: "Verification Failed",
    description: "One or more checks failed and require resubmission.",
  },
  {
    key: "REJECTED",
    title: "Rejected",
    description:
      "Submitted identity documents could not be verified. Please resubmit clearer photos.",
  },
  {
    key: "RETRY_REQUIRED",
    title: "Retry Required",
    description:
      "Additional capture clarity is required. Retry your live scan or document upload.",
  },
];

export function SecurityStatusView() {
  const router = useRouter();
  const [statusData, setStatusData] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stagesExpanded, setStagesExpanded] = useState(false);

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
    void fetchStatus(controller.signal);

    setStagesExpanded(getSecurityProgress().stagesReferenceExpanded);
    updateSecurityProgress({ lastVisitedStep: "status" });

    const unsub = subscribeToStorageKey(STORAGE_KEYS.SECURITY_PROGRESS, () => {
      setStagesExpanded(getSecurityProgress().stagesReferenceExpanded);
    });

    return () => {
      controller.abort();
      unsub();
    };
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
    <div className="space-y-6 font-helvetica">
      {error && (
        <StatusBanner
          variant="error"
          message={error}
          action={
            <button
              type="button"
              onClick={() => void fetchStatus()}
              className="text-xs font-bold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      {isVerified ? (
        <StatusBanner
          variant="success"
          title="Verification Approved"
          message="Your Face Scan and Government ID verification are complete. Continue to Personal Information to set up your profile."
        />
      ) : (
        statusData?.isMockResponse && (
          <StatusBanner
            variant="info"
            message="Displaying local development verification status. Connect the Date² backend service for real facial and government ID verification."
          />
        )
      )}

      {statusData?.failureReason && (
        <StatusBanner
          variant="error"
          title="Verification Issue"
          message={statusData.failureReason}
        />
      )}

      {/* Overall Status Header Card */}
      <div className="flex flex-col gap-4 rounded-[18px] border border-date2-border bg-date2-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-date2-muted">
            Overall Verification Status
          </p>
          <p className="mt-1 text-base font-bold text-date2-ink">
            {loading
              ? "Checking current status..."
              : ALL_STATUS_STEPS.find((s) => s.key === currentOverall)?.title ??
                "Status"}
          </p>
          <p className="mt-0.5 text-xs text-date2-slate">
            {ALL_STATUS_STEPS.find((s) => s.key === currentOverall)
              ?.description ?? ""}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!loading && <VerificationStatusBadge status={currentOverall} />}
          <button
            type="button"
            disabled={loading || isSimulating}
            onClick={() => void fetchStatus()}
            className="rounded-xl border border-date2-softBorder bg-date2-white px-3 py-1.5 text-xs font-bold text-date2-deepIndigo transition-colors hover:border-date2-violet hover:bg-date2-lavenderMist disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Individual Check Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-[16px] border border-date2-border bg-date2-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-date2-ink">Face Scan</h2>
            <VerificationStatusBadge
              status={statusData?.faceScan.status ?? "NOT_STARTED"}
            />
          </div>
          <p className="text-xs leading-relaxed text-date2-slate">
            {statusData?.faceScan.message ?? "No face scan submitted yet."}
          </p>
          {statusData?.faceScan.status !== "VERIFIED" && (
            <Link
              href="/security-check/face-scan"
              className="inline-flex text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
            >
              {statusData?.faceScan.status === "FAILED" ||
              statusData?.faceScan.status === "REJECTED" ||
              statusData?.faceScan.status === "RETRY_REQUIRED"
                ? "Retry Face Scan →"
                : "Go to Face Scan →"}
            </Link>
          )}
        </div>

        <div className="space-y-3 rounded-[16px] border border-date2-border bg-date2-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-date2-ink">
              Government ID Document
            </h2>
            <VerificationStatusBadge
              status={statusData?.documentVerification.status ?? "NOT_STARTED"}
            />
          </div>
          <p className="text-xs leading-relaxed text-date2-slate">
            {statusData?.documentVerification.message ??
              "No identity document submitted yet."}
          </p>
          {statusData?.documentVerification.status !== "VERIFIED" && (
            <Link
              href="/security-check/document-verification"
              className="inline-flex text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
            >
              {statusData?.documentVerification.status === "FAILED" ||
              statusData?.documentVerification.status === "REJECTED" ||
              statusData?.documentVerification.status === "RETRY_REQUIRED"
                ? "Resubmit Document →"
                : "Go to Document Verification →"}
            </Link>
          )}
        </div>
      </div>

      {/* Development-Only Simulation Panel */}
      {canSimulateInDev && (
        <div className="flex flex-col gap-3 rounded-[16px] border border-date2-paleLavender bg-date2-lavenderMist/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-date2-midnight">
              Development Testing Controls
            </p>
            <p className="mt-0.5 text-xs text-date2-slate">
              Both checks are submitted. Simulate backend approval to mark Face
              Scan and Government ID as Verified and continue to Personal
              Information.
            </p>
          </div>
          <button
            type="button"
            disabled={isSimulating || loading}
            onClick={() => void handleSimulateApproval()}
            className="shrink-0 rounded-xl bg-date2-midnight px-4 py-2.5 text-xs font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSimulating
              ? "Simulating Approval..."
              : "Simulate Backend Approval"}
          </button>
        </div>
      )}

      {/* Status Reference List */}
      <div className="space-y-3 rounded-[16px] border border-date2-border bg-date2-canvas p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-muted">
            Verification Stages
          </h3>
          <button
            type="button"
            aria-expanded={stagesExpanded}
            onClick={() => {
              const next = !stagesExpanded;
              setStagesExpanded(next);
              updateSecurityProgress({ stagesReferenceExpanded: next });
            }}
            className="text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
          >
            {stagesExpanded ? "Hide stages" : "Show stages"}
          </button>
        </div>
        {stagesExpanded && (
          <div className="flex flex-wrap gap-2">
            {ALL_STATUS_STEPS.map((step) => {
              const active = step.key === currentOverall;
              return (
                <div
                  key={step.key}
                  className={`rounded-xl border px-3 py-1.5 text-xs ${
                    active
                      ? "border-date2-violet bg-date2-white font-bold text-date2-midnight shadow-sm"
                      : "border-date2-border bg-date2-white/60 text-date2-slate"
                  }`}
                >
                  {step.title}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary Navigation Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton
          type="button"
          variant="secondary"
          isLoading={loading}
          loadingText="Refreshing status..."
          onClick={() => void fetchStatus()}
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
