"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { SubmitButton } from "@/components/auth/SubmitButton";
import {
  COUNTRIES,
  getDocumentTypesForCountry,
  type DocumentTypeConfig,
  type DocumentTypeId,
} from "@/lib/security/countries";
import {
  analyzeDocumentFileQuality,
  type DocumentQualityFeedback,
} from "@/lib/security/documentQuality";
import { formatFileSize } from "@/lib/security/fileValidation";
import { updateSecurityProgress } from "@/lib/storage/localStorageManager";
import {
  SecurityServiceError,
  securityService,
  type DocumentVerifyResponse,
} from "@/services/security/securityService";
import { CountrySelect } from "./CountrySelect";
import { DocumentDropzone } from "./DocumentDropzone";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

type GovIdStage = 1 | 2 | 3 | 4 | 5 | 6;

const STAGE_TITLES: Record<GovIdStage, string> = {
  1: "Country Selection",
  2: "Document Selection",
  3: "Document Capture",
  4: "Quality Guidance",
  5: "Review & Submit",
  6: "Verification Status",
};

const QUICK_FEATURED_COUNTRIES = [
  { code: "IN", label: "India", flag: "🇮🇳" },
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
] as const;

export function DocumentVerificationFlow() {
  // Default India ("IN") matching Flutter's GovernmentIdCountry.india default
  const [stage, setStage] = useState<GovIdStage>(1);
  const [countryCode, setCountryCode] = useState("IN");
  const [documentTypeId, setDocumentTypeId] =
    useState<DocumentTypeId | null>("AADHAAR");
  const [documentReference, setDocumentReference] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [frontQuality, setFrontQuality] =
    useState<DocumentQualityFeedback | null>(null);
  const [backQuality, setBackQuality] =
    useState<DocumentQualityFeedback | null>(null);
  const [analyzingQuality, setAnalyzingQuality] = useState(false);

  const [consentAffirmed, setConsentAffirmed] = useState(false);

  const [countryError, setCountryError] = useState<string | null>(null);
  const [docTypeError, setDocTypeError] = useState<string | null>(null);
  const [frontError, setFrontError] = useState<string | null>(null);
  const [backError, setBackError] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] =
    useState<DocumentVerifyResponse | null>(null);

  const availableDocTypes = useMemo(
    () => (countryCode ? getDocumentTypesForCountry(countryCode) : []),
    [countryCode]
  );

  const selectedDocConfig: DocumentTypeConfig | null = useMemo(
    () => availableDocTypes.find((d) => d.id === documentTypeId) ?? null,
    [availableDocTypes, documentTypeId]
  );

  const selectedCountryName = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode)?.name ?? countryCode,
    [countryCode]
  );

  useEffect(() => {
    updateSecurityProgress({ lastVisitedStep: "document-verification" });
  }, []);

  // Run volatile in-memory quality check whenever entering Stage 4
  useEffect(() => {
    if (stage !== 4) return;
    let cancelled = false;

    const runChecks = async () => {
      setAnalyzingQuality(true);
      try {
        const frontRes = frontFile
          ? await analyzeDocumentFileQuality(frontFile)
          : null;
        const backRes =
          selectedDocConfig?.requiresBackSide && backFile
            ? await analyzeDocumentFileQuality(backFile)
            : null;
        if (!cancelled) {
          setFrontQuality(frontRes);
          setBackQuality(backRes);
        }
      } finally {
        if (!cancelled) {
          setAnalyzingQuality(false);
        }
      }
    };

    void runChecks();
    return () => {
      cancelled = true;
    };
  }, [stage, frontFile, backFile, selectedDocConfig?.requiresBackSide]);

  const handleCountryChange = (nextCode: string) => {
    setCountryCode(nextCode);
    setCountryError(null);
    setSubmitError(null);

    const nextAvailable = getDocumentTypesForCountry(nextCode);
    if (!nextAvailable.some((d) => d.id === documentTypeId)) {
      setDocumentTypeId(nextAvailable[0]?.id ?? null);
      setFrontFile(null);
      setBackFile(null);
      setFrontQuality(null);
      setBackQuality(null);
    }
  };

  const handleDocumentSelect = (doc: DocumentTypeConfig) => {
    setDocumentTypeId(doc.id);
    setDocTypeError(null);
    setSubmitError(null);
    if (!doc.requiresBackSide) {
      setBackFile(null);
      setBackError(null);
      setBackQuality(null);
    }
  };

  const handleContinueFromStage1 = () => {
    if (!countryCode) {
      setCountryError("Please select the issuing country of your ID.");
      return;
    }
    setStage(2);
  };

  const handleContinueFromStage2 = () => {
    if (!selectedDocConfig) {
      setDocTypeError("Please choose an identity document type.");
      return;
    }
    setStage(3);
  };

  const handleContinueFromStage3 = () => {
    let valid = true;
    if (!frontFile) {
      setFrontError(
        selectedDocConfig?.requiresBackSide
          ? "Please upload the front side of your document."
          : "Please upload your document."
      );
      valid = false;
    }
    if (selectedDocConfig?.requiresBackSide && !backFile) {
      setBackError("Please upload the back side of your document.");
      valid = false;
    }
    if (!valid) return;
    setStage(4);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    if (!countryCode || !selectedDocConfig || !frontFile) {
      setSubmitError("Missing required document files. Please review Stage 3.");
      return;
    }
    if (selectedDocConfig.requiresBackSide && !backFile) {
      setSubmitError("Back side upload is required for this document type.");
      return;
    }
    if (!consentAffirmed) {
      setSubmitError(
        "Please affirm the document privacy and authenticity consent."
      );
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const response = await securityService.submitDocumentVerify({
        country: countryCode,
        documentType: selectedDocConfig.id,
        frontFile,
        backFile: selectedDocConfig.requiresBackSide ? backFile : null,
        documentReference: documentReference.trim() || undefined,
        onProgress: (percent) => setUploadProgress(percent),
      });

      // Clear sensitive file references immediately after upload
      setFrontFile(null);
      setBackFile(null);
      setFrontQuality(null);
      setBackQuality(null);
      setDocumentReference("");
      setSubmitResult(response);
      setStage(6);
    } catch (err) {
      if (err instanceof SecurityServiceError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          "Unable to upload your documents right now. Please check your connection and try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage 6: Status Result
  if (stage === 6 && submitResult) {
    const status = submitResult.status;
    const isVerified = status === "VERIFIED";
    const isRejectedOrFailed =
      status === "REJECTED" ||
      status === "FAILED" ||
      status === "RETRY_REQUIRED";

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
          variant={isRejectedOrFailed ? "error" : "success"}
          title={
            isVerified
              ? "Government ID Verified"
              : status === "REJECTED"
                ? "Document Rejected"
                : status === "RETRY_REQUIRED"
                  ? "Retry Capture Required"
                  : status === "FAILED"
                    ? "Document Verification Failed"
                    : "Verification Pending Review"
          }
          message={submitResult.message}
        />

        {submitResult.submissionId && (
          <div className="rounded-[14px] border border-date2-border bg-date2-surface px-4 py-3 text-xs">
            <span className="font-bold text-date2-charcoal">
              Reference ID:{" "}
            </span>
            <code className="font-mono font-bold text-date2-deepIndigo">
              {submitResult.submissionId}
            </code>
          </div>
        )}

        <div className="rounded-[14px] border border-date2-border bg-date2-canvas p-4 text-xs leading-relaxed text-date2-slate">
          <strong className="text-date2-ink">Privacy Notice:</strong> Temporary
          document previews and local file references have been cleared after
          submission.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {isVerified ? (
            <Link
              href="/onboarding/personal-info"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-[14px] bg-date2-midnight px-5 py-3 text-center font-helvetica text-[15px] font-bold leading-snug text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo"
            >
              Continue to Personal Information
            </Link>
          ) : isRejectedOrFailed ? (
            <SubmitButton
              type="button"
              onClick={() => {
                setSubmitResult(null);
                setStage(3);
              }}
            >
              Retake &amp; Resubmit Document
            </SubmitButton>
          ) : (
            <Link
              href="/security-check/status"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-[14px] bg-date2-midnight px-5 py-3 text-center font-helvetica text-[15px] font-bold leading-snug text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo"
            >
              View Verification Status
            </Link>
          )}

          <Link
            href="/security-check"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-[14px] border border-date2-softBorder bg-date2-white px-5 py-3 text-center font-helvetica text-[15px] font-bold leading-snug text-date2-ink transition-colors hover:border-date2-violet hover:bg-date2-lavenderMist/60"
          >
            Back to Security Check
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((stage / 5) * 100);

  return (
    <div className="space-y-6 font-helvetica">
      {/* Stage Progress Bar mirroring Flutter GovernmentIdVerificationScreen */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
          <span>
            Stage {stage} of 5: {STAGE_TITLES[stage]}
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

      {/* Stage 1: Country Selection */}
      {stage === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-date2-ink">
              Select Document Issuing Country
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-date2-slate">
              India is selected by default. Choose any supported issuing region
              to load eligible official documents.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUICK_FEATURED_COUNTRIES.map((item) => {
              const selected = countryCode === item.code;
              const docCount = getDocumentTypesForCountry(item.code).length;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleCountryChange(item.code)}
                  className={`flex items-center justify-between gap-3 rounded-[16px] border p-4 text-left transition-all ${
                    selected
                      ? "border-date2-violet bg-date2-lavenderMist/80 shadow-indigoSoft"
                      : "border-date2-border bg-date2-white hover:border-date2-lightPeriwinkle hover:bg-date2-canvas"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {item.flag}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-date2-ink">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-date2-slate">
                        {docCount} document types supported
                      </p>
                    </div>
                  </div>
                  {selected && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-date2-midnight text-xs font-bold text-date2-limeMark">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="doc-country-select"
              className="block text-[11px] font-bold uppercase tracking-[0.11em] text-date2-charcoal"
            >
              Or Search All Supported Countries
            </label>
            <CountrySelect
              id="doc-country-select"
              value={countryCode}
              onChange={handleCountryChange}
              error={countryError}
            />
            {countryError && (
              <p role="alert" className="text-xs font-bold text-rose-600">
                {countryError}
              </p>
            )}
          </div>

          <SubmitButton type="button" onClick={handleContinueFromStage1}>
            Continue to Document Selection
          </SubmitButton>
        </div>
      )}

      {/* Stage 2: Document Type Selection */}
      {stage === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-date2-ink">
              Select Document for {selectedCountryName}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-date2-slate">
              Only documents valid in your selected region are shown below.
            </p>
          </div>

          <DocumentTypeSelector
            countryCode={countryCode}
            selectedId={documentTypeId}
            onSelect={handleDocumentSelect}
          />
          {docTypeError && (
            <p role="alert" className="text-xs font-bold text-rose-600">
              {docTypeError}
            </p>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="doc-reference-input"
              className="block text-[11px] font-bold uppercase tracking-[0.11em] text-date2-charcoal"
            >
              {selectedDocConfig?.label ?? "Document"} Reference / Last 4 Digits
              (Optional)
            </label>
            <input
              id="doc-reference-input"
              type="text"
              value={documentReference}
              onChange={(e) => setDocumentReference(e.target.value)}
              placeholder="Optional last 4 digits or reference ID"
              className="date2-input-base"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton
              type="button"
              variant="secondary"
              onClick={() => setStage(1)}
            >
              Back
            </SubmitButton>
            <SubmitButton type="button" onClick={handleContinueFromStage2}>
              Proceed to Document Capture
            </SubmitButton>
          </div>
        </div>
      )}

      {/* Stage 3: Document Capture & Upload */}
      {stage === 3 && selectedDocConfig && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-date2-ink">
              Capture {selectedDocConfig.label}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-date2-slate">
              Use your browser camera with framing guides or upload a crisp
              JPG, PNG, WebP, or PDF file directly.
            </p>
          </div>

          <DocumentDropzone
            id="document-front"
            label={
              selectedDocConfig.requiresBackSide
                ? `Front Side (${selectedDocConfig.label})`
                : selectedDocConfig.label
            }
            helperText={
              selectedDocConfig.requiresBackSide
                ? "Clear photo or PDF of the front side showing your details."
                : "Clear photo or PDF of the photo/information page."
            }
            file={frontFile}
            onFileChange={(file) => {
              setFrontFile(file);
              setFrontError(null);
            }}
            error={frontError}
            onError={setFrontError}
          />

          {selectedDocConfig.requiresBackSide && (
            <DocumentDropzone
              id="document-back"
              label={`Back Side (${selectedDocConfig.label})`}
              helperText="Clear photo or PDF of the reverse side."
              file={backFile}
              onFileChange={(file) => {
                setBackFile(file);
                setBackError(null);
              }}
              error={backError}
              onError={setBackError}
            />
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton
              type="button"
              variant="secondary"
              onClick={() => setStage(2)}
            >
              Back
            </SubmitButton>
            <SubmitButton type="button" onClick={handleContinueFromStage3}>
              Continue to Quality Guidance
            </SubmitButton>
          </div>
        </div>
      )}

      {/* Stage 4: On-Device Quality Guidance */}
      {stage === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-date2-ink">
              On-Device Quality Guidance
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-date2-slate">
              Real in-memory pixel checks evaluate sharpness, glare, lighting,
              and framing. Official OCR &amp; government authenticity checks run
              on the backend after submission.
            </p>
          </div>

          {analyzingQuality ? (
            <div className="rounded-[16px] border border-date2-border bg-date2-surface p-5 text-xs font-bold text-date2-deepIndigo">
              Checking document readability in volatile memory...
            </div>
          ) : (
            <div className="space-y-4">
              {frontQuality && (
                <QualitySummaryCard
                  sideLabel="Front Side Quality"
                  quality={frontQuality}
                />
              )}
              {backQuality && (
                <QualitySummaryCard
                  sideLabel="Back Side Quality"
                  quality={backQuality}
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton
              type="button"
              variant="secondary"
              onClick={() => setStage(3)}
            >
              Retake / Replace Photos
            </SubmitButton>
            <SubmitButton
              type="button"
              disabled={analyzingQuality}
              onClick={() => setStage(5)}
            >
              Proceed to Review &amp; Submit
            </SubmitButton>
          </div>
        </div>
      )}

      {/* Stage 5: Review & Submit */}
      {stage === 5 && selectedDocConfig && (
        <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5">
          {submitError && <StatusBanner variant="error" message={submitError} />}

          <div>
            <h2 className="text-lg font-bold text-date2-ink">
              Review &amp; Confirm Submission
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-date2-slate">
              Inspect your document summary and privacy consent before
              submitting over HTTPS.
            </p>
          </div>

          <div className="space-y-3 rounded-[18px] border border-date2-border bg-date2-surface p-5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-date2-slate">Country</span>
              <span className="font-bold text-date2-ink">
                {selectedCountryName} ({countryCode})
              </span>
            </div>
            <div className="border-t border-date2-border pt-3 flex items-center justify-between gap-2">
              <span className="text-date2-slate">Document Type</span>
              <span className="font-bold text-date2-ink">
                {selectedDocConfig.label}
              </span>
            </div>
            {documentReference.trim() && (
              <div className="border-t border-date2-border pt-3 flex items-center justify-between gap-2">
                <span className="text-date2-slate">Document Ref</span>
                <span className="font-bold text-date2-ink">
                  {documentReference.trim()}
                </span>
              </div>
            )}
            <div className="border-t border-date2-border pt-3 flex items-center justify-between gap-3">
              <span className="shrink-0 text-date2-slate">Front Side</span>
              <span className="min-w-0 flex-1 truncate text-right font-bold text-date2-ink">
                {frontFile
                  ? `${frontFile.name} (${formatFileSize(frontFile.size)})`
                  : "Not attached"}
              </span>
            </div>
            {selectedDocConfig.requiresBackSide && (
              <div className="border-t border-date2-border pt-3 flex items-center justify-between gap-3">
                <span className="shrink-0 text-date2-slate">Back Side</span>
                <span className="min-w-0 flex-1 truncate text-right font-bold text-date2-ink">
                  {backFile
                    ? `${backFile.name} (${formatFileSize(backFile.size)})`
                    : "Not attached"}
                </span>
              </div>
            )}
            <div className="border-t border-date2-border pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setStage(3)}
                className="text-xs font-bold text-date2-deepIndigo hover:text-date2-violet hover:underline"
              >
                Edit / Retake Files
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-date2-border bg-date2-canvas px-4 py-3 text-xs leading-relaxed text-date2-charcoal">
            <input
              type="checkbox"
              checked={consentAffirmed}
              disabled={isSubmitting}
              onChange={(e) => setConsentAffirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-date2-softBorder text-date2-midnight focus:ring-date2-violet"
            />
            <span>
              I confirm this government ID belongs to me and consent to
              transient verification processing under Date² privacy standards.
            </span>
          </label>

          {isSubmitting && uploadProgress !== null && (
            <div className="space-y-1.5" aria-live="polite">
              <div className="flex justify-between text-xs font-bold text-date2-deepIndigo">
                <span>Uploading documents securely...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-date2-lavenderMist">
                <div
                  className="h-full rounded-full bg-date2-violet transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => setStage(4)}
            >
              Back
            </SubmitButton>
            <SubmitButton
              isLoading={isSubmitting}
              loadingText="Submitting Document..."
            >
              Submit Document for Verification
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}

function QualitySummaryCard({
  sideLabel,
  quality,
}: {
  sideLabel: string;
  quality: DocumentQualityFeedback;
}) {
  const checks = [
    { label: "Sharpness", ok: quality.isSharp },
    { label: "No Flash Glare", ok: quality.isNoGlare },
    { label: "Edges Visible", ok: quality.areEdgesVisible },
    { label: "Lighting", ok: quality.isLightingAdequate },
  ];

  return (
    <div className="space-y-3 rounded-[16px] border border-date2-border bg-date2-surface p-4 text-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-date2-ink">{sideLabel}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 font-bold ${
            quality.isCompliant
              ? "bg-date2-lavenderMist text-date2-deepIndigo"
              : "bg-amber-100 text-amber-900"
          }`}
        >
          {quality.isCompliant ? "Passed ✓" : "Review Warnings"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {checks.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-date2-border bg-date2-white px-3 py-2"
          >
            <span className="text-date2-charcoal">{item.label}</span>
            <span
              className={`font-bold ${
                item.ok ? "text-date2-deepIndigo" : "text-amber-700"
              }`}
            >
              {item.ok ? "✓" : "!"}
            </span>
          </div>
        ))}
      </div>

      {quality.issues.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-amber-800">
          {quality.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
