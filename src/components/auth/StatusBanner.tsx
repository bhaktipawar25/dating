"use client";

import React from "react";

interface StatusBannerProps {
  variant: "error" | "success" | "info" | "warning";
  title?: string;
  message: string;
  action?: React.ReactNode;
}

const VARIANT_STYLES: Record<StatusBannerProps["variant"], string> = {
  error: "border-rose-200 bg-rose-50/90 text-rose-800",
  success: "border-date2-paleLavender bg-date2-lavenderMist text-date2-midnight",
  info: "border-date2-border bg-date2-surface text-date2-charcoal",
  warning: "border-amber-200 bg-amber-50/90 text-amber-900",
};

export function StatusBanner({
  variant,
  title,
  message,
  action,
}: StatusBannerProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`rounded-[14px] border px-4 py-3 font-helvetica text-sm ${VARIANT_STYLES[variant]}`}
    >
      <div className="flex items-start gap-2.5">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          {variant === "error" && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {variant === "success" && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-date2-violet">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {(variant === "info" || variant === "warning") && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-date2-deepIndigo">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </span>
        <div className="flex-1 space-y-1">
          {title && <p className="font-bold">{title}</p>}
          <p className="leading-relaxed">{message}</p>
          {action && <div className="pt-1">{action}</div>}
        </div>
      </div>
    </div>
  );
}
