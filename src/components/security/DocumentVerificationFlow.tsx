"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { SubmitButton } from "@/components/auth/SubmitButton";
import {
  COUNTRIES,
  getDocumentTypesForCountry,
  type DocumentTypeConfig,
  type DocumentTypeId,
} from "@/lib/security/countries";
import { formatFileSize } from "@/lib/security/fileValidation";
import {
  SecurityServiceError,
  securityService,
  type DocumentVerifyResponse,
} from "@/services/security/securityService";
import { CountrySelect } from "./CountrySelect";
import { DocumentDropzone } from "./DocumentDropzone";
import { DocumentTypeSelector } from "./DocumentTypeSelector";
import { VerificationStatusBadge } from "./VerificationStatusBadge";

export function DocumentVerificationFlow() {
  const [countryCode, setCountryCode] = useState("");
  const [documentTypeId, setDocumentTypeId] = useState<DocumentTypeId | null>(
    null
  );
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

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

  const handleCountryChange = (nextCode: string) => {
    setCountryCode(nextCode);
    setCountryError(null);
    setSubmitError(null);

    const nextAvailable = getDocumentTypesForCountry(nextCode);
    if (
      documentTypeId &&
      !nextAvailable.some((d) => d.id === documentTypeId)
    ) {
      setDocumentTypeId(null);
      setFrontFile(null);
      setBackFile(null);
    }
  };

  const handleDocumentSelect = (doc: DocumentTypeConfig) => {
    setDocumentTypeId(doc.id);
    setDocTypeError(null);
    setSubmitError(null);
    if (!doc.requiresBackSide) {
      setBackFile(null);
      setBackError(null);
    }
  };

  const validateForm = (): boolean => {
    let valid = true;

    if (!countryCode) {
      setCountryError("Please select the issuing country of your ID.");
      valid = false;
    }

    if (!selectedDocConfig) {
      setDocTypeError("Please choose an identity document type.");
      valid = false;
    }

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

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    if (!validateForm() || !selectedDocConfig || !frontFile) {
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
        onProgress: (percent) => setUploadProgress(percent),
      });

      // Clear local file references after submission succeeds
      setFrontFile(null);
      setBackFile(null);
      setSubmitResult(response);
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

  if (submitResult) {
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
              ? "Document submission failed"
              : "Documents submitted"
          }
          message={submitResult.message}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/security-check/status"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            View Verification Status
          </Link>
          <Link
            href="/security-check"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-brand-border bg-brand-ice/70 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            Back to Security Check
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {submitError && <StatusBanner variant="error" message={submitError} />}

      {/* Step A: Issuing Country */}
      <div className="space-y-2">
        <label
          htmlFor="doc-country-select"
          className="block text-sm font-semibold text-brand-ink"
        >
          1. Issuing Country
        </label>
        <CountrySelect
          id="doc-country-select"
          value={countryCode}
          onChange={handleCountryChange}
          disabled={isSubmitting}
          error={countryError}
        />
        {countryError && (
          <p role="alert" className="text-xs font-medium text-rose-600">
            {countryError}
          </p>
        )}
      </div>

      {/* Step B: ID Type Selection */}
      {countryCode && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-brand-ink">
              2. Select Government ID Type
            </span>
            <span className="text-xs text-brand-muted">
              Showing options for {selectedCountryName}
            </span>
          </div>

          <DocumentTypeSelector
            countryCode={countryCode}
            selectedId={documentTypeId}
            onSelect={handleDocumentSelect}
            disabled={isSubmitting}
          />

          {docTypeError && (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {docTypeError}
            </p>
          )}
        </div>
      )}

      {/* Step C & D: Front / Back Upload & Previews */}
      {selectedDocConfig && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-brand-border bg-brand-ice/50 p-4 text-xs text-brand-muted">
            <strong className="text-brand-ink">Upload tips:</strong> Ensure all
            four corners of your {selectedDocConfig.label} are visible, text is
            sharp and readable, and there is no flash glare. Files are only
            uploaded when you click <strong>Submit for Verification</strong>.
          </div>

          <DocumentDropzone
            id="document-front"
            label={
              selectedDocConfig.requiresBackSide
                ? `3. Upload ${selectedDocConfig.label} (Front Side)`
                : `3. Upload ${selectedDocConfig.label}`
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
            disabled={isSubmitting}
            error={frontError}
            onError={setFrontError}
          />

          {selectedDocConfig.requiresBackSide && (
            <DocumentDropzone
              id="document-back"
              label={`4. Upload ${selectedDocConfig.label} (Back Side)`}
              helperText="Clear photo or PDF of the reverse side."
              file={backFile}
              onFileChange={(file) => {
                setBackFile(file);
                setBackError(null);
              }}
              disabled={isSubmitting}
              error={backError}
              onError={setBackError}
            />
          )}
        </div>
      )}

      {/* Review Summary before explicit submission */}
      {selectedDocConfig &&
        frontFile &&
        (!selectedDocConfig.requiresBackSide || backFile) && (
          <div className="rounded-2xl border border-brand-border bg-brand-ice/60 p-4 text-xs space-y-2">
            <p className="font-semibold text-brand-forest">
              Review before submission
            </p>
            <dl className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <div>
                <dt className="text-brand-muted">Country</dt>
                <dd className="font-medium text-brand-ink">
                  {selectedCountryName}
                </dd>
              </div>
              <div>
                <dt className="text-brand-muted">Document Type</dt>
                <dd className="font-medium text-brand-ink">
                  {selectedDocConfig.label}
                </dd>
              </div>
              <div>
                <dt className="text-brand-muted">Front File</dt>
                <dd className="truncate font-medium text-brand-ink">
                  {frontFile.name} ({formatFileSize(frontFile.size)})
                </dd>
              </div>
              {selectedDocConfig.requiresBackSide && backFile && (
                <div>
                  <dt className="text-brand-muted">Back File</dt>
                  <dd className="truncate font-medium text-brand-ink">
                    {backFile.name} ({formatFileSize(backFile.size)})
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

      {/* Upload Progress Indicator */}
      {isSubmitting && uploadProgress !== null && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex justify-between text-xs font-medium text-brand-forest">
            <span>Uploading documents securely...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-ice">
            <div
              className="h-full rounded-full bg-brand-mint transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row">
        <SubmitButton
          isLoading={isSubmitting}
          loadingText="Uploading documents..."
        >
          Submit for Verification
        </SubmitButton>
        <Link
          href="/security-check"
          className="inline-flex w-full items-center justify-center rounded-xl border border-brand-border bg-brand-ice/70 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
        >
          Back to Security Check
        </Link>
      </div>
    </form>
  );
}
