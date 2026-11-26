"use client";

import React from "react";

interface SubmitButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  type?: "submit" | "button";
  variant?: "primary" | "secondary";
  onClick?: () => void;
}

export function SubmitButton({
  children,
  isLoading = false,
  loadingText,
  disabled = false,
  type = "submit",
  variant = "primary",
  onClick,
}: SubmitButtonProps) {
  const isDisabled = disabled || isLoading;

  const baseStyles =
    "inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] px-5 font-helvetica text-[15px] font-bold transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender disabled:cursor-not-allowed disabled:opacity-60";

  const variantStyles =
    variant === "primary"
      ? "bg-date2-midnight text-date2-white shadow-indigoSoft hover:bg-date2-deepIndigo active:scale-[0.99] disabled:bg-date2-softBorder disabled:text-date2-slate"
      : "border border-date2-softBorder bg-date2-white text-date2-ink hover:border-date2-violet hover:bg-date2-lavenderMist/60";

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles}`}
    >
      {isLoading && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 animate-spin"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-25"
          />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V1C5.925 1 1 5.925 1 12h3Z"
            className="opacity-90"
          />
        </svg>
      )}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
}
