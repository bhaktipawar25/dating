"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWebcam } from "@/hooks/useWebcam";
import {
  formatFileSize,
  isPdfFile,
  validateDocumentFile,
} from "@/lib/security/fileValidation";

interface DocumentDropzoneProps {
  id: string;
  label: string;
  helperText: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string | null;
  onError?: (error: string | null) => void;
}

export function DocumentDropzone({
  id,
  label,
  helperText,
  file,
  onFileChange,
  disabled = false,
  error,
  onError,
}: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Optional webcam snapshot state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [snapshotBlob, setSnapshotBlob] = useState<Blob | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const webcam = useWebcam();

  // Maintain and revoke object URLs cleanly when file changes or unmounts
  useEffect(() => {
    if (!file || isPdfFile(file)) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!snapshotBlob) {
      setSnapshotUrl(null);
      return;
    }
    const url = URL.createObjectURL(snapshotBlob);
    setSnapshotUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [snapshotBlob]);

  const acceptFile = (candidate: File | null) => {
    if (!candidate) return;
    const validationError = validateDocumentFile(candidate);
    if (validationError) {
      onError?.(validationError);
      return;
    }
    onError?.(null);
    onFileChange(candidate);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0] ?? null;
    acceptFile(dropped);
  };

  const openWebcamSnapshot = async () => {
    setSnapshotBlob(null);
    setCameraOpen(true);
    await webcam.startCamera("environment");
  };

  const closeWebcamSnapshot = () => {
    webcam.stopCamera();
    setSnapshotBlob(null);
    setCameraOpen(false);
  };

  const handleCaptureSnapshot = async () => {
    const blob = await webcam.capturePhoto({ mirror: false, quality: 0.92 });
    if (!blob) return;
    webcam.stopCamera();
    setSnapshotBlob(blob);
  };

  const confirmSnapshot = () => {
    if (!snapshotBlob) return;
    const snapshotFile = new File(
      [snapshotBlob],
      `${id}-webcam-snapshot.jpg`,
      { type: "image/jpeg" }
    );
    acceptFile(snapshotFile);
    setSnapshotBlob(null);
    setCameraOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-brand-ink">
          {label}
        </label>
        {!file && !cameraOpen && (
          <button
            type="button"
            disabled={disabled}
            onClick={openWebcamSnapshot}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-ice/70 px-2.5 py-1 text-xs font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Use Webcam
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          acceptFile(picked);
          e.currentTarget.value = "";
        }}
      />

      {cameraOpen ? (
        <div className="rounded-2xl border border-brand-border bg-brand-ice/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-brand-forest">
              Document Webcam Capture
            </p>
            <button
              type="button"
              onClick={closeWebcamSnapshot}
              className="text-xs font-semibold text-brand-muted hover:text-brand-ink"
            >
              Cancel
            </button>
          </div>

          {snapshotUrl ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-brand-border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={snapshotUrl}
                  alt={`${label} snapshot preview`}
                  className="max-h-60 w-full object-contain bg-brand-canvas"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openWebcamSnapshot}
                  className="flex-1 rounded-xl border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-forest hover:bg-brand-ice"
                >
                  Retake Snapshot
                </button>
                <button
                  type="button"
                  onClick={confirmSnapshot}
                  className="flex-1 rounded-xl bg-brand-forest px-3 py-2 text-xs font-semibold text-white hover:bg-brand-forestHover"
                >
                  Use This Photo
                </button>
              </div>
            </div>
          ) : webcam.status === "active" ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-ink">
                <video
                  ref={webcam.videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="max-h-60 w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="w-full rounded-xl bg-brand-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-forestHover"
              >
                Capture Document Snapshot
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-brand-border bg-white p-4 text-center text-xs text-brand-muted space-y-2">
              <p>
                {webcam.errorMessage ??
                  (webcam.status === "requesting"
                    ? "Requesting camera permission..."
                    : "Preparing camera...")}
              </p>
              {(webcam.status === "permission-denied" ||
                webcam.status === "unavailable" ||
                webcam.status === "error") && (
                <button
                  type="button"
                  onClick={() => webcam.startCamera("environment")}
                  className="rounded-lg bg-brand-forest px-3 py-1.5 font-semibold text-white hover:bg-brand-forestHover"
                >
                  Retry Camera
                </button>
              )}
            </div>
          )}
        </div>
      ) : file ? (
        <div className="rounded-2xl border border-brand-border bg-brand-ice/45 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {previewUrl ? (
              <div className="h-28 w-full overflow-hidden rounded-xl border border-brand-border bg-white sm:w-40 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={`${label} preview`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-28 w-full shrink-0 flex-col items-center justify-center rounded-xl border border-brand-border bg-white text-brand-forest sm:w-40">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-8 w-8 text-brand-mint"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="mt-1 text-[11px] font-semibold">PDF File</span>
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="truncate text-sm font-semibold text-brand-ink">
                  {file.name}
                </p>
                <p className="text-xs text-brand-muted">
                  {formatFileSize(file.size)} · Ready for review
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => inputRef.current?.click()}
                  className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:opacity-50"
                >
                  Replace File
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onError?.(null);
                    onFileChange(null);
                  }}
                  className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
                >
                  Remove File
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors ${
            error
              ? "border-rose-300 bg-rose-50/40"
              : isDragging
                ? "border-brand-mint bg-brand-ice"
                : "border-brand-border bg-brand-canvas/70 hover:border-brand-mint hover:bg-brand-ice/40"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-forest shadow-sm border border-brand-border/70">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </span>

          <p className="mt-3 text-sm font-medium text-brand-ink">
            Drag and drop your file here
          </p>
          <p className="mt-1 text-xs text-brand-muted">{helperText}</p>

          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-4 rounded-xl border border-brand-border bg-white px-4 py-2 text-xs font-semibold text-brand-forest shadow-sm transition-colors hover:bg-brand-ice focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint disabled:opacity-50"
          >
            Browse Files
          </button>

          <p className="mt-2.5 text-[11px] text-brand-muted">
            JPG, PNG, WebP or PDF · Max 10 MB
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
