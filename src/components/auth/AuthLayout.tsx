"use client";

import React from "react";
import Link from "next/link";
import { Date2Logo } from "./Date2Logo";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional back destination matching mobile AppBar back button. */
  backHref?: string;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  backHref = "/welcome",
}: AuthLayoutProps) {
  return (
    <div className="date2-auth-backdrop relative flex min-h-screen flex-col px-4 py-6 font-helvetica text-date2-ink sm:px-6 sm:py-8 lg:px-10">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label="Go back"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-date2-border bg-date2-white text-date2-charcoal shadow-sm transition-colors hover:bg-date2-lavenderMist hover:text-date2-midnight focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          )}

          <Link
            href="/welcome"
            className="inline-flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            <Date2Logo height={24} showContainer={false} />
            <span className="hidden text-xs font-bold uppercase tracking-[0.08em] text-date2-deepIndigo sm:inline">
              Date Smart • Connect Meaningfully
            </span>
          </Link>
        </div>

        <span className="rounded-full border border-date2-paleLavender bg-date2-lavenderMist px-3 py-1 text-xs font-bold text-date2-midnight">
          Date²
        </span>
      </header>

      {/* Main Content */}
      <main className="mx-auto my-6 flex w-full max-w-5xl flex-1 items-center justify-center sm:my-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Desktop Brand Panel mirroring Date² Welcome Hero */}
          <aside className="hidden lg:col-span-5 lg:flex lg:flex-col">
            <div className="overflow-hidden rounded-[24px] border border-date2-border bg-date2-white p-8 shadow-indigoCard">
              <div className="rounded-2xl bg-date2-midnight p-6 text-date2-white shadow-indigoSoft">
                <Date2Logo height={34} showContainer={false} className="mb-4" />
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-date2-lightPeriwinkle">
                  Authentic Dating &amp; Verified Companionship
                </p>
                <h2 className="mt-2 font-helvetica text-[26px] font-bold leading-tight tracking-tight text-date2-white">
                  Meet someone who gets you.
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-date2-paleLavender">
                  Real connections. Memorable dates. Safe companionship. All on
                  your terms.
                </p>
              </div>

              <div className="mt-6 space-y-3.5">
                <div className="flex items-start gap-3 rounded-2xl border border-date2-border bg-date2-canvas p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-date2-lavenderMist text-date2-violet">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 21s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 11c0 5.5-7 10-7 10Z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-date2-ink">
                      Meaningful Connections
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-date2-slate">
                      Discover people who appreciate who you are with authentic
                      affirmation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-date2-border bg-date2-canvas p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-date2-lavenderMist text-date2-deepIndigo">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
                      <path d="m9.5 12 2 2 3.5-4" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-date2-ink">
                      Verified &amp; Safer Experiences
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-date2-slate">
                      Live biometric verification, mutual video consent, and
                      privacy shields.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Primary Auth Card */}
          <section
            aria-labelledby="auth-page-title"
            className="mx-auto w-full max-w-md lg:col-span-7 lg:max-w-lg"
          >
            <div className="rounded-[24px] border border-date2-border bg-date2-white p-6 shadow-indigoCard sm:p-8">
              <h1
                id="auth-page-title"
                className="font-helvetica text-2xl font-bold tracking-tight text-date2-ink sm:text-[28px]"
              >
                {title}
              </h1>
              <p className="mt-1.5 font-helvetica text-sm font-normal leading-relaxed text-date2-slate">
                {subtitle}
              </p>

              <div className="mt-6">{children}</div>

              {footer && (
                <div className="mt-6 border-t border-date2-border pt-5 text-center font-helvetica text-sm text-date2-slate">
                  {footer}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
