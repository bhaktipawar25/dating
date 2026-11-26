"use client";

import React from "react";
import Link from "next/link";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/30"
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
      </header>

      {/* Main Content */}
      <main className="mx-auto my-6 flex w-full max-w-5xl flex-1 items-center justify-center sm:my-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-12 lg:gap-12">
          {/* Desktop Brand Showcase Panel */}
          <aside className="hidden lg:col-span-5 lg:flex lg:flex-col">
            <div className="rounded-3xl border border-brand-border bg-white/85 p-8 shadow-card backdrop-blur-md">
              <div className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-mint" />
                <span className="text-sm font-semibold tracking-tight text-brand-forest">
                  Date²
                </span>
              </div>

              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-brand-ink">
                Meet people who truly click with you.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-brand-muted">
                A calm, modern space designed for meaningful conversations and
                genuine connections.
              </p>

              {/* Soft palette accent card */}
              <div
                aria-hidden="true"
                className="mt-7 rounded-2xl border border-brand-border/80 bg-brand-ice/75 p-5"
              >
                <div className="space-y-3">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white">
                    <div className="h-full w-4/5 rounded-full bg-brand-mint" />
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white">
                    <div className="h-full w-3/5 rounded-full bg-brand-seafoam" />
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-white">
                    <div className="h-full w-2/5 rounded-full bg-brand-forest" />
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
            <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-card sm:p-8">
              <h1
                id="auth-page-title"
                className="text-2xl font-bold tracking-tight text-brand-ink sm:text-[26px]"
              >
                {title}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
                {subtitle}
              </p>

              <div className="mt-6">{children}</div>

              {footer && (
                <div className="mt-6 border-t border-brand-border/70 pt-5 text-center text-sm text-brand-muted">
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
