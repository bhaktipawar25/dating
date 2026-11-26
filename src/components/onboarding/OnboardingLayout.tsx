"use client";

import React from "react";
import Link from "next/link";
import { Date2Logo } from "@/components/auth/Date2Logo";
import { ProfileAccountMenu } from "@/components/auth/ProfileAccountMenu";

interface OnboardingLayoutProps {
  currentStep: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}

const ONBOARDING_STEPS = [
  { step: 1, label: "About You" },
  { step: 2, label: "What Do You Like?" },
  { step: 3, label: "Review Profile" },
  { step: 4, label: "Ready" },
] as const;

export function OnboardingLayout({
  currentStep,
  children,
}: OnboardingLayoutProps) {
  const progressPercent = Math.round((currentStep / ONBOARDING_STEPS.length) * 100);

  return (
    <div className="date2-auth-backdrop relative flex min-h-screen flex-col px-4 py-6 font-helvetica text-date2-ink sm:px-6 sm:py-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/onboarding/personal-info"
          className="inline-flex w-fit items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
        >
          <Date2Logo height={24} showContainer={false} />
          <span className="rounded-full border border-date2-paleLavender bg-date2-lavenderMist px-2.5 py-0.5 text-[11px] font-bold text-date2-midnight">
            Personal Info
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ol
            aria-label="Profile onboarding progress"
            className="flex flex-wrap items-center gap-1.5 rounded-[16px] border border-date2-border bg-date2-white/95 p-1.5 shadow-sm backdrop-blur-sm"
          >
            {ONBOARDING_STEPS.map((item) => {
              const isActive = item.step === currentStep;
              const isDone = item.step < currentStep;
              return (
                <li
                  key={item.step}
                  aria-current={isActive ? "step" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-date2-midnight text-date2-white shadow-sm"
                      : isDone
                        ? "bg-date2-lavenderMist text-date2-deepIndigo"
                        : "text-date2-muted"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      isActive
                        ? "bg-date2-violet text-date2-white"
                        : isDone
                          ? "bg-date2-deepIndigo text-date2-limeMark"
                          : "bg-date2-surface text-date2-muted"
                    }`}
                  >
                    {isDone ? "✓" : item.step}
                  </span>
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ol>

          <ProfileAccountMenu theme="date2" />
        </div>
      </header>

      {/* Mobile / Compact Progress Bar */}
      <div className="mx-auto mt-4 w-full max-w-6xl space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
          <span>
            Step {currentStep} of {ONBOARDING_STEPS.length}:{" "}
            {ONBOARDING_STEPS.find((s) => s.step === currentStep)?.label}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-date2-lavenderMist">
          <div
            className="h-full rounded-full bg-date2-violet transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <main className="mx-auto my-6 w-full max-w-6xl flex-1 sm:my-7">
        {children}
      </main>
    </div>
  );
}
