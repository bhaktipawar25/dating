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

interface LivenessChallenge {
  id: string;
  title: string;
  instruction: string;
  helper: string;
}

/** Exact active liveness sequence from Flutter BiometricLivenessAction */
const LIVENESS_CHALLENGES: readonly LivenessChallenge[] = [
  {
    id: "blink_twice",
    title: "Blink twice",
    instruction: "Blink your eyes twice naturally",
    helper: "Keep your head centered inside the oval while blinking",
  },
  {
    id: "turn_left",
    title: "Turn head ~15° left",
    instruction: "Turn head ~15° to the left",
    helper: "Keep your face inside the oval guide",
  },
  {
    id: "turn_right",
    title: "Turn head ~15° right",
    instruction: "Turn head ~15° to the right",
    helper: "Keep your face inside the oval guide",
  },
] as const;

export function FaceScanFlow() {
  const webcam = useWebcam();

  const [stage, setStage] = useState<FaceScanStage>("intro");
  const [livenessPhase, setLivenessPhase] = useState<
    "aligning" | "challenging" | "completed"
  >("aligning");
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [lightingGood, setLightingGood] = useState(true);

  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] =
    useState<FaceScanSubmitResponse | null>(null);

  // Manage volatile preview URL lifecycle
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

  // Lightweight volatile canvas luminance check while live webcam is active (never stores frames)
  useEffect(() => {
    if (stage !== "live-camera" || webcam.status !== "active") return;

    const timer = setInterval(() => {
      const video = webcam.videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = 48;
      canvas.height = 36;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, 48, 36);
        const frame = ctx.getImageData(0, 0, 48, 36).data;
        let sum = 0;
        const pixels = frame.length / 4;
        for (let i = 0; i < frame.length; i += 4) {
          sum += 0.299 * frame[i] + 0.587 * frame[i + 1] + 0.114 * frame[i + 2];
        }
        const meanLuma = pixels > 0 ? sum / pixels : 128;
        setLightingGood(meanLuma >= 35);
        ctx.clearRect(0, 0, 48, 36);
      }
      canvas.width = 0;
      canvas.height = 0;
    }, 900);

    return () => clearInterval(timer);
  }, [stage, webcam.status, webcam.videoRef]);

  // Ensure tracks always stop when navigating away
  useEffect(() => {
    return () => {
      webcam.stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartScan = async () => {
    setSubmitError(null);
    setCapturedBlob(null);
    setLivenessPhase("aligning");
    setChallengeIndex(0);
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

  const handleStartLiveness = () => {
    setChallengeIndex(0);
    setLivenessPhase("challenging");
  };

  const handleCompleteChallengeStep = () => {
    if (challengeIndex < LIVENESS_CHALLENGES.length - 1) {
      setChallengeIndex((prev) => prev + 1);
    } else {
      setLivenessPhase("completed");
    }
  };

  const handleCapturePhoto = async () => {
    setSubmitError(null);
    const blob = await webcam.capturePhoto({ mirror: true, quality: 0.92 });
    if (!blob) {
      setSubmitError(
        "Camera frame was not ready yet. Please hold steady inside the oval guide and try capturing again."
      );
      return;
    }

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
    const isFailed =
      submitResult.status === "FAILED" || submitResult.status === "REJECTED";
    return (
      <div className="space-y-6 font-helvetica">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <VerificationStatusBadge status={submitResult.overallStatus} />
          {submitResult.isMockResponse && (
            <span className="rounded-full border border-date2-paleLavender bg-date2-lavenderMist px-3 py-1 text-xs font-bold text-date2-deepIndigo">
              Local Verification Queue
            </span>
          )}
        </div>

        <StatusBanner
          variant={isFailed ? "error" : "success"}
          title={
            isFailed ? "Verification Incomplete" : "Face Scan Submitted"
          }
          message={submitResult.message}
        />

        {submitResult.submissionId && (
          <div className="rounded-[14px] border border-date2-border bg-date2-surface px-4 py-3 text-xs">
            <span className="font-bold text-date2-charcoal">Proof ID: </span>
            <code className="font-mono font-bold text-date2-deepIndigo">
              {submitResult.submissionId}
            </code>
          </div>
        )}

        <div className="rounded-[14px] border border-date2-border bg-date2-canvas p-4 text-xs leading-relaxed text-date2-slate">
          <strong className="text-date2-ink">Biometric Privacy:</strong>{" "}
          Temporary camera buffers and raw canvas image data have been cleared
          from browser memory. No selfies are saved in browser storage.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {isFailed ? (
            <SubmitButton type="button" onClick={() => void handleStartScan()}>
              Retry Live Verification
            </SubmitButton>
          ) : (
            <Link
              href="/security-check/document-verification"
              className="inline-flex h-[52px] flex-1 items-center justify-center rounded-[14px] bg-date2-midnight px-5 font-helvetica text-[15px] font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
            >
              Proceed to Government ID
            </Link>
          )}
          <Link
            href="/security-check/status"
            className="inline-flex h-[52px] flex-1 items-center justify-center rounded-[14px] border border-date2-softBorder bg-date2-white px-5 font-helvetica text-[15px] font-bold text-date2-ink transition-colors hover:border-date2-violet hover:bg-date2-lavenderMist/60"
          >
            View Verification Status
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "permission-error") {
    const unavailable = webcam.status === "unavailable";
    return (
      <div className="space-y-5 font-helvetica">
        <VerificationStatusBadge status="CAMERA_PERMISSION_REQUIRED" />

        <StatusBanner
          variant="warning"
          title={
            unavailable
              ? "Camera Hardware Unavailable"
              : "Camera Access Required"
          }
          message={
            webcam.errorMessage ??
            "To run live liveness checks without storing photos, Date² requires front camera permission."
          }
        />

        <div className="space-y-3 rounded-[16px] border border-date2-border bg-date2-surface p-5 text-sm">
          <h2 className="font-bold text-date2-ink">
            How to enable camera access
          </h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-date2-slate">
            <li>
              Click the camera or lock icon in your browser&apos;s address bar.
            </li>
            <li>
              Set <strong>Camera</strong> permission to <strong>Allow</strong>{" "}
              for this site.
            </li>
            <li>
              Ensure no other video call or camera app is locking the webcam,
              then click{" "}
              <strong>
                {unavailable ? "Retry Camera" : "Retry Webcam Permission"}
              </strong>
              .
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton type="button" onClick={() => void handleStartScan()}>
            {unavailable ? "Retry Camera" : "Retry Webcam Permission"}
          </SubmitButton>
          <SubmitButton
            type="button"
            variant="secondary"
            onClick={() => setStage("intro")}
          >
            Back to Security Check
          </SubmitButton>
        </div>
      </div>
    );
  }

  if (stage === "live-camera") {
    const currentChallenge = LIVENESS_CHALLENGES[challengeIndex];
    const isLivenessComplete = livenessPhase === "completed";
    const progressPercent =
      livenessPhase === "aligning"
        ? 25
        : livenessPhase === "challenging"
          ? 35 + Math.round(((challengeIndex + 1) / LIVENESS_CHALLENGES.length) * 45)
          : 90;

    return (
      <div className="space-y-5 font-helvetica">
        {submitError && <StatusBanner variant="error" message={submitError} />}

        {/* Top Progress Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
            <span>
              {livenessPhase === "aligning"
                ? "Step 1: Center Inside Oval"
                : isLivenessComplete
                  ? "Challenges Complete — Ready to Capture"
                  : `Challenge ${challengeIndex + 1} of ${LIVENESS_CHALLENGES.length}`}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-date2-lavenderMist">
            <div
              className="h-full rounded-full bg-date2-violet transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          {/* Live Mirrored Webcam Viewport + SVG Oval Alignment Guide */}
          <div className="lg:col-span-7">
            <div
              className={`relative mx-auto aspect-[3/4] max-w-sm overflow-hidden rounded-[24px] border-2 bg-date2-ink shadow-indigoCard sm:aspect-[4/3] sm:max-w-none ${
                isLivenessComplete
                  ? "border-date2-limeMark"
                  : lightingGood
                    ? "border-date2-violet"
                    : "border-amber-400"
              }`}
            >
              <video
                ref={webcam.videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full -scale-x-100 object-cover"
              />

              {/* SVG oval cutout guide */}
              <svg
                aria-hidden="true"
                viewBox="0 0 400 300"
                preserveAspectRatio="xMidYMid slice"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <defs>
                  <mask id="date2-face-oval-cutout">
                    <rect width="400" height="300" fill="white" />
                    <ellipse cx="200" cy="148" rx="86" ry="112" fill="black" />
                  </mask>
                </defs>
                <rect
                  width="400"
                  height="300"
                  fill="rgba(4, 5, 21, 0.45)"
                  mask="url(#date2-face-oval-cutout)"
                />
                <ellipse
                  cx="200"
                  cy="148"
                  rx="86"
                  ry="112"
                  fill="none"
                  stroke={isLivenessComplete ? "#E3FF85" : "#8D8FF8"}
                  strokeWidth="3"
                  strokeDasharray={isLivenessComplete ? "none" : "8 6"}
                />
              </svg>

              {/* Environmental Status Badges matching Flutter */}
              <div className="absolute inset-x-3 top-3 flex flex-wrap items-center justify-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur-sm ${
                    lightingGood
                      ? "bg-date2-midnight/85 text-date2-limeMark"
                      : "bg-amber-600/90 text-white"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {lightingGood ? "Lighting OK" : "Improve lighting"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-date2-midnight/85 px-3 py-1 text-[11px] font-bold text-date2-white backdrop-blur-sm">
                  Keep face centered
                </span>
              </div>

              <div className="absolute inset-x-4 bottom-3.5 text-center">
                <span className="inline-block rounded-full bg-date2-midnight/90 px-4 py-1.5 text-xs font-bold text-date2-white backdrop-blur-sm">
                  {livenessPhase === "aligning"
                    ? "Center your face inside the oval"
                    : isLivenessComplete
                      ? "Face alignment & liveness ready — tap Capture Photo"
                      : currentChallenge.instruction}
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: Flutter Real-Time Guidance & Challenge Sequence */}
          <div className="space-y-4 lg:col-span-5">
            <div className="space-y-4 rounded-[18px] border border-date2-border bg-date2-surface p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
                  {livenessPhase === "aligning"
                    ? "Guided Alignment"
                    : isLivenessComplete
                      ? "Challenges Complete"
                      : `Challenge ${challengeIndex + 1} of ${LIVENESS_CHALLENGES.length}`}
                </p>
                <h2 className="mt-1 text-base font-bold text-date2-ink">
                  {livenessPhase === "aligning"
                    ? "Position your face in the oval"
                    : isLivenessComplete
                      ? "Ready to Capture Frame"
                      : currentChallenge.instruction}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-date2-slate">
                  {livenessPhase === "aligning"
                    ? "Ensure bright front lighting, remove sunglasses or hats, and start the guided liveness sequence."
                    : isLivenessComplete
                      ? "Hold steady and capture your live photo to submit over HTTPS for backend verification."
                      : currentChallenge.helper}
                </p>
              </div>

              <ol className="space-y-2">
                {LIVENESS_CHALLENGES.map((item, idx) => {
                  const done =
                    isLivenessComplete ||
                    (livenessPhase === "challenging" && idx < challengeIndex);
                  const active =
                    livenessPhase === "challenging" && idx === challengeIndex;

                  return (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                        active
                          ? "border-date2-violet bg-date2-white font-bold text-date2-midnight shadow-sm"
                          : done
                            ? "border-date2-paleLavender bg-date2-lavenderMist/80 font-bold text-date2-deepIndigo"
                            : "border-date2-border/80 bg-date2-white/60 text-date2-slate"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          active || done
                            ? "bg-date2-midnight text-date2-limeMark"
                            : "bg-date2-lavenderMist text-date2-deepIndigo"
                        }`}
                      >
                        {done ? "✓" : idx + 1}
                      </span>
                      <span>{item.title}</span>
                    </li>
                  );
                })}
              </ol>

              <p className="flex items-start gap-2 rounded-xl border border-date2-border bg-date2-white p-3 text-[11px] leading-relaxed text-date2-slate">
                <span className="font-bold text-date2-deepIndigo">🔒</span>
                <span>
                  Strict privacy: frames are processed in volatile memory only —
                  never saved to gallery or browser storage.
                </span>
              </p>
            </div>

            <div className="space-y-2.5">
              {livenessPhase === "aligning" && (
                <SubmitButton type="button" onClick={handleStartLiveness}>
                  Start Liveness Check
                </SubmitButton>
              )}

              {livenessPhase === "challenging" && (
                <SubmitButton
                  type="button"
                  onClick={handleCompleteChallengeStep}
                >
                  {challengeIndex < LIVENESS_CHALLENGES.length - 1
                    ? "Completed — Next Prompt"
                    : "Complete Liveness Prompts"}
                </SubmitButton>
              )}

              {isLivenessComplete && (
                <SubmitButton type="button" onClick={() => void handleCapturePhoto()}>
                  Capture &amp; Verify Photo
                </SubmitButton>
              )}

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
      <div className="space-y-5 font-helvetica">
        {submitError && (
          <StatusBanner
            variant="error"
            message={submitError}
            action={
              <button
                type="button"
                onClick={() => void handleSubmitFaceScan()}
                className="text-xs font-bold underline underline-offset-2"
              >
                Retry submission
              </button>
            }
          />
        )}

        <div className="mx-auto max-w-md space-y-4">
          <div className="overflow-hidden rounded-[22px] border border-date2-border bg-date2-canvas shadow-indigoSoft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Captured face scan preview"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>

          <p className="text-center text-xs text-date2-slate">
            Confirm your face is clearly visible, centered, and well lit before
            submitting to Date² verification.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => void handleRetake()}
            >
              Retake Photo
            </SubmitButton>
            <SubmitButton
              type="button"
              isLoading={isSubmitting}
              loadingText="Submitting face scan..."
              onClick={() => void handleSubmitFaceScan()}
            >
              Submit Face Scan
            </SubmitButton>
          </div>
        </div>
      </div>
    );
  }

  // Initial Intro Stage
  return (
    <div className="space-y-6 font-helvetica">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-[16px] border border-date2-border bg-date2-surface p-5">
          <h2 className="text-sm font-bold text-date2-ink">
            Why Face Verification Is Required
          </h2>
          <p className="text-xs leading-relaxed text-date2-slate">
            Date² is an affirming, verified community. Complete a live face scan
            and active liveness prompts (blink twice, turn head ~15° left/right)
            to prove your presence before uploading your Government ID.
          </p>
        </div>

        <div className="space-y-2 rounded-[16px] border border-date2-border bg-date2-surface p-5">
          <h2 className="text-sm font-bold text-date2-ink">
            Camera Permission &amp; Privacy
          </h2>
          <p className="text-xs leading-relaxed text-date2-slate">
            Camera access starts only when you click{" "}
            <strong>Start Face Scan</strong>. Captured frames stay strictly in
            memory during submission over HTTPS and are never persisted in local
            storage.
          </p>
        </div>
      </div>

      <div className="rounded-[16px] border border-date2-border bg-date2-white p-5">
        <h3 className="text-sm font-bold text-date2-ink">Before You Begin</h3>
        <ul className="mt-3 grid grid-cols-1 gap-2.5 text-xs text-date2-charcoal sm:grid-cols-3">
          <li className="rounded-xl border border-date2-border bg-date2-canvas px-3.5 py-2.5 font-bold">
            1. Find bright, even front lighting
          </li>
          <li className="rounded-xl border border-date2-border bg-date2-canvas px-3.5 py-2.5 font-bold">
            2. Remove sunglasses or face coverings
          </li>
          <li className="rounded-xl border border-date2-border bg-date2-canvas px-3.5 py-2.5 font-bold">
            3. Allow browser camera permission
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton
          type="button"
          isLoading={webcam.status === "requesting"}
          loadingText="Requesting camera access..."
          onClick={() => void handleStartScan()}
        >
          Start Face Scan
        </SubmitButton>
        <Link
          href="/security-check"
          className="inline-flex h-[52px] w-full items-center justify-center rounded-[14px] border border-date2-softBorder bg-date2-white px-5 font-helvetica text-[15px] font-bold text-date2-ink transition-colors hover:border-date2-violet hover:bg-date2-lavenderMist/60"
        >
          Back to Security Check
        </Link>
      </div>
    </div>
  );
}
