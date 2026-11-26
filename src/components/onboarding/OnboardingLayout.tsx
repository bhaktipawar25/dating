"use client";

import React from "react";
import Link from "next/link";

interface OnboardingLayoutProps {
  currentStep: 1 | 2 | 3;
  children: React.ReactNode;
}

const ONBOARDING_STEPS = [
  { step: 1, label: "About You" },
  { step: 2, label: "What Do You Like?" },
  { step: 3, label: "Ready" },
] as const;

export function OnboardingLayout({
  currentStep,
  children,
}: OnboardingLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/onboarding/personal-info"
          className="inline-flex w-fit items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/30"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-forest text-white shadow-soft"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 5.5-7 10-7 10Z" />
              <circle cx="12" cy="10" r="1.5" fill="#4FD4C4" stroke="none" />
            </svg>
          </span>
          <span className="text-xl font-bold tracking-tight text-brand-ink">
            Date<span className="text-brand-mint">²</span>
          </span>
        </Link>

        <ol
          aria-label="Profile onboarding progress"
          className="flex items-center gap-2 rounded-2xl border border-brand-border bg-white/90 p-1.5 shadow-sm backdrop-blur-sm"
        >
          {ONBOARDING_STEPS.map((item) => {
            const isActive = item.step === currentStep;
            const isDone = item.step < currentStep;
            return (
              <li
                key={item.step}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-forest text-white shadow-sm"
                    : isDone
                      ? "bg-brand-ice text-brand-forest"
                      : "text-brand-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    isActive
                      ? "bg-brand-mint text-brand-forest"
                      : isDone
                        ? "bg-brand-forest text-white"
                        : "bg-brand-ice text-brand-muted"
                  }`}
                >
                  {isDone ? "✓" : item.step}
                </span>
                <span>{item.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <main className="mx-auto my-6 w-full max-w-6xl flex-1 sm:my-8">
        {children}
      </main>
    </div>
  );
}
