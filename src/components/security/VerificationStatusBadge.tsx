"use client";

import React from "react";
import type {
  KycOverallStatus,
  StepVerificationStatus,
} from "@/services/security/types";

type AnyStatus = KycOverallStatus | StepVerificationStatus;

interface StatusMeta {
  label: string;
  classes: string;
  dotColor: string;
}

const STATUS_META: Record<AnyStatus, StatusMeta> = {
  NOT_STARTED: {
    label: "Not Started",
    classes: "border-brand-border bg-brand-canvas text-brand-muted",
    dotColor: "bg-brand-muted/60",
  },
  CAMERA_PERMISSION_REQUIRED: {
    label: "Camera Permission Required",
    classes: "border-amber-200 bg-amber-50 text-amber-900",
    dotColor: "bg-amber-500",
  },
  FACE_SCAN_SUBMITTED: {
    label: "Face Scan Submitted",
    classes: "border-brand-mint/60 bg-brand-ice text-brand-forest",
    dotColor: "bg-brand-mint",
  },
  DOCUMENT_SUBMITTED: {
    label: "Document Submitted",
    classes: "border-brand-mint/60 bg-brand-ice text-brand-forest",
    dotColor: "bg-brand-mint",
  },
  SUBMITTED: {
    label: "Submitted",
    classes: "border-brand-mint/60 bg-brand-ice text-brand-forest",
    dotColor: "bg-brand-mint",
  },
  VERIFICATION_PENDING: {
    label: "Verification Pending",
    classes: "border-brand-seafoam bg-brand-ice text-brand-forest",
    dotColor: "bg-brand-mint",
  },
  PENDING: {
    label: "Verification Pending",
    classes: "border-brand-seafoam bg-brand-ice text-brand-forest",
    dotColor: "bg-brand-mint",
  },
  VERIFIED: {
    label: "Verified",
    classes: "border-brand-forest/30 bg-brand-forest text-white",
    dotColor: "bg-brand-mint",
  },
  VERIFICATION_FAILED: {
    label: "Verification Failed",
    classes: "border-rose-200 bg-rose-50 text-rose-800",
    dotColor: "bg-rose-600",
  },
  FAILED: {
    label: "Verification Failed",
    classes: "border-rose-200 bg-rose-50 text-rose-800",
    dotColor: "bg-rose-600",
  },
};

interface VerificationStatusBadgeProps {
  status: AnyStatus;
}

export function VerificationStatusBadge({
  status,
}: VerificationStatusBadgeProps) {
  const meta = STATUS_META[status] ?? STATUS_META.NOT_STARTED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.classes}`}
    >
      {status === "VERIFIED" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5 text-brand-mint"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
            clipRule="evenodd"
          />
        </svg>
      ) : status === "VERIFICATION_FAILED" || status === "FAILED" ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5 text-rose-600"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${meta.dotColor}`}
        />
      )}
      <span>{meta.label}</span>
    </span>
  );
}
