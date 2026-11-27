"use client";

import React from "react";
import Link from "next/link";
import { Date2Logo } from "./Date2Logo";

const WELCOME_BENEFITS = [
  {
    title: "Meaningful Connections",
    subtitle:
      "Discover people who appreciate who you are with authentic affirmation.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 11c0 5.5-7 10-7 10Z" />
      </svg>
    ),
    accentClass: "bg-date2-lavenderMist text-date2-violet",
  },
  {
    title: "Verified & Safer Experiences",
    subtitle:
      "Live biometric verification, mutual video consent, and privacy shields.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
        <path d="m9.5 12 2 2 3.5-4" />
      </svg>
    ),
    accentClass: "bg-date2-lavenderMist text-date2-deepIndigo",
  },
  {
    title: "Dates Designed Around You",
    subtitle:
      "AI date planning within your exact budget and curated partner venues.",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3Z" />
        <path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" />
      </svg>
    ),
    accentClass: "bg-date2-lavenderMist text-date2-accentViolet",
  },
];

/**
 * Welcome screen matching Flutter's `WelcomeScreen` (`welcome_screen.dart`).
 */
export function WelcomeScreen() {
  return (
    <div className="date2-auth-backdrop min-h-screen px-3 py-5 font-helvetica text-date2-ink xs:px-4 sm:px-6 sm:py-10 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col xl:max-w-6xl">
        {/* Top Brand Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Date2Logo height={26} showContainer={false} />
            <span className="rounded-full border border-date2-paleLavender bg-date2-lavenderMist px-3 py-1 text-xs font-bold text-date2-midnight">
              Date²
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-date2-deepIndigo">
            Date Smart • Connect Meaningfully
          </p>
        </header>

        {/* Main Content Grid */}
        <main className="mt-8 grid items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Hero Graphic Banner */}
          <div className="lg:col-span-5">
            <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-date2-midnight via-date2-deepIndigo to-date2-violet p-6 text-center text-date2-white shadow-indigoCard xs:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-date2-softPeriwinkle/25 blur-2xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-date2-accentOrchid/20 blur-2xl"
              />

              <div className="relative mx-auto flex flex-col items-center">
                <Date2Logo height={56} showContainer={true} flat={true} />
                <p className="mt-5 text-sm font-bold tracking-wide text-date2-paleLavender">
                  Authentic Dating &amp; Verified Companionship
                </p>
              </div>
            </div>
          </div>

          {/* Copy + Value Pillars + CTAs */}
          <div className="rounded-[26px] border border-date2-border bg-date2-white p-4 shadow-indigoCard xs:p-6 sm:p-8 lg:col-span-7">
            <h1 className="font-helvetica text-2xl font-bold leading-tight tracking-tight text-date2-ink xs:text-3xl sm:text-[34px]">
              Meet someone who gets you.
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-date2-slate sm:text-[15px]">
              Real connections. Memorable dates. Safe companionship. All on your
              terms.
            </p>

            {/* Three Core Value Pillars */}
            <div className="mt-6 space-y-3.5">
              {WELCOME_BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex items-start gap-3.5 rounded-[16px] border border-date2-border bg-date2-canvas p-3.5"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${benefit.accentClass}`}
                  >
                    {benefit.icon}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-date2-ink">
                      {benefit.title}
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-date2-slate">
                      {benefit.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-7 space-y-3.5">
              <Link
                href="/register"
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-date2-midnight px-6 py-3 text-center font-helvetica text-[15px] font-bold text-date2-white shadow-indigoSoft transition-all hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
              >
                <span>Create Your Account</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>

              <p className="pt-1 text-center text-sm text-date2-slate">
                Already a member?{" "}
                <Link
                  href="/login"
                  className="font-bold text-date2-deepIndigo transition-colors hover:text-date2-violet hover:underline"
                >
                  Log In
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
