"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { useWebcam } from "@/hooks/useWebcam";
import {
  SecurityServiceError,
  securityService,
  type FaceScanSubmitResponse,
} from "@/services/security/securityService";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

type FaceScanStage =
  | "intro"
  | "permission-error"
  | "live-camera"
  | "preview"
  | "submitted";

const LIVENESS_STEPS = [
  "Look straight at the camera",
  "Keep your face centered inside the oval",
  "Stay still in even lighting with no glare",
] as const;

export function FaceScanFlow() {
  const webcam = useWebcam();

  const [stage, setStage] = useState<FaceScanStage>("intro");
  const [livenessIndex, setLivenessIndex] = useState(0);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] =
    useState<FaceScanSubmitResponse | null>(null);

  // Manage temporary object URL lifecycle safely
  useEffect(() => {
    if (!capturedBlob) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(capturedBlob);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [capturedBlob]);

  // Step through liveness cues gently while live camera is open
  useEffect(() => {
    if (stage !== "live-camera") return;
    setLivenessIndex(0);

    const interval = setInterval(() => {
      setLivenessIndex((prev) =>
        prev < LIVENESS_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 2200);

    return () => clearInterval(interval);
  }, [stage]);

  const handleStartScan = async () => {
    setSubmitError(null);
    setCapturedBlob(null);
    const ok = await webcam.startCamera("user");
    if (ok) {
      setStage("live-camera");
    } else {
      setStage("permission-error");
    }
  };

  const handleCancelCamera = () => {
    webcam.stopCamera();
    setCapturedBlob(null);
    setSubmitError(null);
    setStage("intro");
  };

  const handleCapturePhoto = async () => {
    setSubmitError(null);
    const blob = await webcam.capturePhoto({ mirror: true, quality: 0.92 });
    if (!blob) {
      setSubmitError(
        "Camera frame was not ready yet. Please hold steady and try capturing again."
      );
      return;
    }

    // Stop camera tracks immediately once frame is captured
    webcam.stopCamera();
    setCapturedBlob(blob);
    setStage("preview");
  };

  const handleRetake = async () => {
    setCapturedBlob(null);
    setSubmitError(null);
    await handleStartScan();
  };

  const handleSubmitFaceScan = async () => {
    if (!capturedBlob || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await securityService.submitFaceScan({
        imageBlob: capturedBlob,
        filename: "date2-face-scan.jpg",
      });
      // Release captured blob from memory after submission
      setCapturedBlob(null);
      setSubmitResult(response);
      setStage("submitted");
    } catch (err) {
      if (err instanceof SecurityServiceError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          "Unable to submit your face scan right now. Please check your connection and retry."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stage === "submitted" && submitResult) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <VerificationStatusBadge status={submitResult.overallStatus} />
          {submitResult.isMockResponse && (
            <span className="rounded-full border border-brand-border bg-brand-canvas px-3 py-1 text-xs font-medium text-brand-muted">
              UI Test Service Response
            </span>
          )}
        </div>

        <StatusBanner
          variant={submitResult.status === "FAILED" ? "error" : "success"}
          title={
            submitResult.status === "FAILED"
              ? "Face scan could not be processed"
              : "Face scan submitted"
          }
          message={submitResult.message}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/security-check/document-verification"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            Continue to Document Verification
          </Link>
          <Link
            href="/security-check/status"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-brand-border bg-brand-ice/70 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            View Verification Status
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "permission-error") {
    return (
      <div className="space-y-5">
        <VerificationStatusBadge status="CAMERA_PERMISSION_REQUIRED" />

        <StatusBanner
          variant="warning"
          title={
            webcam.status === "unavailable"
              ? "Camera unavailable"
              : "Camera permission required"
          }
          message={
            webcam.errorMessage ??
            "Camera access is needed to capture your face verification photo."
          }
        />

        <div className="rounded-2xl border border-brand-border bg-brand-ice/60 p-5 space-y-3 text-sm">
          <h2 className="font-semibold text-brand-ink">
            How to enable camera access
          </h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-brand-muted">
            <li>
              Click the camera or lock icon in your browser&apos;s address bar.
            </li>
            <li>
              Set <strong>Camera</strong> permission to <strong>Allow</strong>{" "}
              for this site.
            </li>
            <li>
              Ensure no other video call or camera app is currently locking the
              webcam, then click <strong>Retry Camera</strong> below.
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton type="button" onClick={handleStartScan}>
            Retry Camera
          </SubmitButton>
          <SubmitButton
            type="button"
            variant="secondary"
            onClick={() => setStage("intro")}
          >
            Back
          </SubmitButton>
        </div>
      </div>
    );
  }

  if (stage === "live-camera") {
    return (
      <div className="space-y-5">
        {submitError && <StatusBanner variant="error" message={submitError} />}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* Live mirrored rounded webcam preview + SVG oval guide */}
          <div className="lg:col-span-7">
            <div className="relative mx-auto aspect-[3/4] max-w-sm overflow-hidden rounded-3xl border-2 border-brand-border bg-brand-ink shadow-card sm:aspect-[4/3] sm:max-w-none">
              <video
                ref={webcam.videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full -scale-x-100 object-cover"
              />

              {/* SVG oval face-alignment overlay */}
              <svg
                aria-hidden="true"
                viewBox="0 0 400 300"
                preserveAspectRatio="xMidYMid slice"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <defs>
                  <mask id="face-oval-cutout">
                    <rect width="400" height="300" fill="white" />
                    <ellipse cx="200" cy="148" rx="86" ry="112" fill="black" />
                  </mask>
                </defs>
                <rect
                  width="400"
                  height="300"
                  fill="rgba(22, 63, 59, 0.42)"
                  mask="url(#face-oval-cutout)"
                />
                <ellipse
                  cx="200"
                  cy="148"
                  rx="86"
                  ry="112"
                  fill="none"
                  stroke="#4FD4C4"
                  strokeWidth="3"
                  strokeDasharray="8 6"
                />
              </svg>

              {/* Camera Status Pill */}
              <div className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-brand-forest/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand-mint" />
                Camera Active
              </div>

              <div className="absolute inset-x-4 bottom-3.5 text-center">
                <span className="inline-block rounded-full bg-brand-forest/85 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                  Position your face inside the oval guide
                </span>
              </div>
            </div>
          </div>

          {/* Step-by-step Liveness Instructions */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border border-brand-border bg-brand-ice/60 p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-brand-ink">
                  Liveness Guidance
                </h2>
                <p className="mt-1 text-xs text-brand-muted">
                  Follow these steps before capturing your photo. Actual liveness
                  and identity checks are completed securely by the verification
                  service after submission.
                </p>
              </div>

              <ol className="space-y-2.5">
                {LIVENESS_STEPS.map((instruction, index) => {
                  const isCurrent = index === livenessIndex;
                  const isCompleted = index < livenessIndex;
                  return (
                    <li
                      key={instruction}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                        isCurrent
                          ? "border-brand-mint bg-white font-semibold text-brand-forest shadow-sm"
                          : isCompleted
                            ? "border-brand-border bg-white/80 text-brand-ink"
                            : "border-transparent bg-white/50 text-brand-muted"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          isCurrent || isCompleted
                            ? "bg-brand-forest text-white"
                            : "bg-brand-ice text-brand-muted"
                        }`}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="space-y-2.5">
              <SubmitButton type="button" onClick={handleCapturePhoto}>
                Capture Photo
              </SubmitButton>
              <SubmitButton
                type="button"
                variant="secondary"
                onClick={handleCancelCamera}
              >
                Cancel Camera
              </SubmitButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "preview" && previewUrl) {
    return (
      <div className="space-y-5">
        {submitError && (
          <StatusBanner
            variant="error"
            message={submitError}
            action={
              <button
                type="button"
                onClick={handleSubmitFaceScan}
                className="text-xs font-semibold underline underline-offset-2"
              >
                Retry submission
              </button>
            }
          />
        )}

        <div className="mx-auto max-w-md space-y-4">
          <div className="overflow-hidden rounded-3xl border border-brand-border bg-brand-canvas shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Captured face scan preview"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>

          <p className="text-center text-xs text-brand-muted">
            Check that your face is clearly visible, centered, and unobstructed
            before submitting.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={handleRetake}
            >
              Retake Photo
            </SubmitButton>
            <SubmitButton
              type="button"
              isLoading={isSubmitting}
              loadingText="Submitting face scan..."
              onClick={handleSubmitFaceScan}
            >
              Continue Verification
            </SubmitButton>
          </div>
        </div>
      </div>
    );
  }

  // Initial Face Scan Screen (stage === "intro")
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-brand-border bg-brand-ice/60 p-5 space-y-2">
          <h2 className="text-sm font-bold text-brand-ink">
            Why face verification is required
          </h2>
          <p className="text-xs leading-relaxed text-brand-muted">
            Date² verifies every member to prevent fake accounts and keep
            interactions genuine. A quick live photo confirms your face matches
            your government ID.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-ice/60 p-5 space-y-2">
          <h2 className="text-sm font-bold text-brand-ink">
            Camera &amp; privacy notice
          </h2>
          <p className="text-xs leading-relaxed text-brand-muted">
            Camera access starts only when you click <strong>Start Face Scan</strong>
            . Your captured frame is transmitted securely over HTTPS for
            verification and is never stored in browser local storage.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-5">
        <h3 className="text-sm font-semibold text-brand-ink">
          Before you begin
        </h3>
        <ul className="mt-2.5 grid grid-cols-1 gap-2 text-xs text-brand-muted sm:grid-cols-3">
          <li className="rounded-xl bg-brand-canvas px-3 py-2.5">
            1. Find bright, even front lighting
          </li>
          <li className="rounded-xl bg-brand-canvas px-3 py-2.5">
            2. Remove sunglasses or face coverings
          </li>
          <li className="rounded-xl bg-brand-canvas px-3 py-2.5">
            3. Allow browser camera permission
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton
          type="button"
          isLoading={webcam.status === "requesting"}
          loadingText="Requesting camera access..."
          onClick={handleStartScan}
        >
          Start Face Scan
        </SubmitButton>
        <Link
          href="/security-check"
          className="inline-flex w-full items-center justify-center rounded-xl border border-brand-border bg-brand-ice/70 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
        >
          Back to Security Check
        </Link>
      </div>
    </div>
  );
}
