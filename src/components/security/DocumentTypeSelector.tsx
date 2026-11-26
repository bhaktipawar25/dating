"use client";

import React from "react";
import {
  getDocumentTypesForCountry,
  type DocumentTypeConfig,
  type DocumentTypeId,
} from "@/lib/security/countries";

interface DocumentTypeSelectorProps {
  countryCode: string;
  selectedId: DocumentTypeId | null;
  onSelect: (doc: DocumentTypeConfig) => void;
  disabled?: boolean;
}

function DocumentIcon({ id }: { id: DocumentTypeId }) {
  switch (id) {
    case "PASSPORT":
      return (
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
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <circle cx="12" cy="10" r="3" />
          <path d="M9 16h6" />
        </svg>
      );
    case "DRIVERS_LICENSE":
      return (
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
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="8.5" cy="11" r="2" />
          <path d="M13 10h5M13 14h4M6.5 15.5c.8-1 3.2-1 4 0" />
        </svg>
      );
    case "AADHAAR":
    case "PAN":
    case "NATIONAL_ID":
    default:
      return (
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
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <path d="M7 9h4M7 13h10M7 16h6" />
          <circle cx="15.5" cy="9" r="1.5" />
        </svg>
      );
  }
}

export function DocumentTypeSelector({
  countryCode,
  selectedId,
  onSelect,
  disabled = false,
}: DocumentTypeSelectorProps) {
  const options = getDocumentTypesForCountry(countryCode);

  return (
    <div
      role="radiogroup"
      aria-label="Government ID document type"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {options.map((doc) => {
        const isSelected = doc.id === selectedId;
        return (
          <button
            key={doc.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(doc)}
            className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/25 disabled:cursor-not-allowed disabled:opacity-60 ${
              isSelected
                ? "border-brand-forest bg-brand-ice/80 shadow-soft"
                : "border-brand-border bg-white hover:border-brand-mint hover:bg-brand-canvas"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isSelected
                  ? "bg-brand-forest text-white"
                  : "bg-brand-ice text-brand-forest"
              }`}
            >
              <DocumentIcon id={doc.id} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-brand-ink">
                  {doc.label}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-brand-muted border border-brand-border/70">
                  {doc.requiresBackSide ? "Front & back" : "Front only"}
                </span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-brand-muted">
                {doc.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
