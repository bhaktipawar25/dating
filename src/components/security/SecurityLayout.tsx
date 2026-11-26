"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SecurityLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const SECURITY_STEPS = [
  { href: "/security-check", label: "Overview" },
  { href: "/security-check/face-scan", label: "Face Scan" },
  { href: "/security-check/document-verification", label: "ID Document" },
  { href: "/security-check/status", label: "Status" },
] as const;

export function SecurityLayout({
  title,
  subtitle,
  children,
}: SecurityLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {/* Header with Date² brand and step navigation */}
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/security-check"
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

        <nav aria-label="Security verification steps" className="overflow-x-auto">
          <ul className="flex items-center gap-1.5 rounded-2xl border border-brand-border bg-white/90 p-1 shadow-sm backdrop-blur-sm">
            {SECURITY_STEPS.map((step) => {
              const isActive = pathname === step.href;
              return (
                <li key={step.href}>
                  <Link
                    href={step.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mint ${
                      isActive
                        ? "bg-brand-forest text-white shadow-sm"
                        : "text-brand-muted hover:bg-brand-ice hover:text-brand-forest"
                    }`}
                  >
                    {step.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* Main Container */}
      <main className="mx-auto my-6 flex w-full max-w-4xl flex-1 items-start justify-center sm:my-8">
        <section
          aria-labelledby="security-page-title"
          className="w-full rounded-3xl border border-brand-border bg-white p-5 shadow-card sm:p-8"
        >
          <div className="border-b border-brand-border/70 pb-5">
            <h1
              id="security-page-title"
              className="text-2xl font-bold tracking-tight text-brand-ink sm:text-[28px]"
            >
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
              {subtitle}
            </p>
          </div>

          <div className="mt-6">{children}</div>
        </section>
      </main>
    </div>
  );
}
