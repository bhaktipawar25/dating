"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Date2Logo } from "@/components/auth/Date2Logo";
import { ProfileAccountMenu } from "@/components/auth/ProfileAccountMenu";

interface SecurityLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  backHref?: string;
}

const SECURITY_STEPS = [
  { href: "/security-check", label: "Security Check" },
  { href: "/security-check/face-scan", label: "Face Scan" },
  { href: "/security-check/document-verification", label: "Government ID" },
  { href: "/security-check/status", label: "Status" },
] as const;

export function SecurityLayout({
  title,
  subtitle,
  children,
  backHref,
}: SecurityLayoutProps) {
  const pathname = usePathname();
  const resolvedBackHref =
    backHref ??
    (pathname === "/security-check" ? undefined : "/security-check");

  return (
    <div className="date2-auth-backdrop relative flex min-h-screen flex-col px-3 py-4 font-helvetica text-date2-ink sm:px-6 sm:py-8 lg:px-10">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full items-center justify-between gap-2 md:w-auto">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            {resolvedBackHref && (
              <Link
                href={resolvedBackHref}
                aria-label="Back to Security Check"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-date2-border bg-date2-white text-date2-charcoal shadow-sm transition-colors hover:bg-date2-lavenderMist hover:text-date2-midnight focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender sm:h-10 sm:w-10"
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
              href="/security-check"
              className="inline-flex w-fit items-center gap-2 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
            >
              <Date2Logo height={24} showContainer={false} />
              <span className="rounded-full border border-date2-paleLavender bg-date2-lavenderMist px-2.5 py-0.5 text-[11px] font-bold text-date2-midnight">
                Security Check
              </span>
            </Link>
          </div>

          <div className="md:hidden">
            <ProfileAccountMenu theme="date2" />
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3">
          <nav
            aria-label="Security verification steps"
            className="w-full min-w-0 sm:w-auto"
          >
            <ul className="grid grid-cols-2 gap-1 rounded-[16px] border border-date2-border bg-date2-white/95 p-1 shadow-sm backdrop-blur-sm xs:grid-cols-4 sm:flex">
              {SECURITY_STEPS.map((step) => {
                const isActive = pathname === step.href;
                return (
                  <li key={step.href} className="min-w-0">
                    <Link
                      href={step.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`inline-flex w-full items-center justify-center truncate rounded-xl px-2 py-1.5 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-date2-violet sm:w-auto sm:px-3 sm:text-xs ${
                        isActive
                          ? "bg-date2-midnight text-date2-white shadow-sm"
                          : "text-date2-slate hover:bg-date2-lavenderMist hover:text-date2-midnight"
                      }`}
                    >
                      {step.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden md:block">
            <ProfileAccountMenu theme="date2" />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto my-4 flex w-full max-w-4xl flex-1 items-start justify-center sm:my-8 lg:max-w-5xl">
        <section
          aria-labelledby="security-page-title"
          className="w-full rounded-[22px] border border-date2-border bg-date2-white p-3.5 shadow-indigoCard xs:p-4 sm:rounded-[24px] sm:p-8"
        >
          <div className="border-b border-date2-border pb-4 sm:pb-5">
            <h1
              id="security-page-title"
              className="font-helvetica text-xl font-bold tracking-tight text-date2-ink xs:text-2xl sm:text-[28px]"
            >
              {title}
            </h1>
            <p className="mt-1.5 font-helvetica text-sm font-normal leading-relaxed text-date2-slate">
              {subtitle}
            </p>
          </div>

          <div className="mt-6">{children}</div>
        </section>
      </main>
    </div>
  );
}
