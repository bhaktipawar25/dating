"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { ProfileAvatar } from "@/components/home/ProfileAvatar";
import { runAllLogoutCleanups } from "@/lib/auth/sessionCleanup";
import {
  AuthServiceError,
  authService,
} from "@/services/auth/authService";

interface ProfileAccountMenuProps {
  username?: string;
  showHomeLink?: boolean;
  theme?: "brand" | "date2";
}

export function ProfileAccountMenu({
  username,
  showHomeLink = false,
  theme = "brand",
}: ProfileAccountMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      await authService.logout();
      // Tear down active WebSockets, WebRTC peer connections, streams & vanish state
      runAllLogoutCleanups();
      setConfirmOpen(false);
      setMenuOpen(false);
      router.replace("/login");
    } catch (err) {
      setLogoutError(
        err instanceof AuthServiceError
          ? err.message
          : "Unable to complete logout right now. Please try again."
      );
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className={
            theme === "date2"
              ? "inline-flex items-center gap-2 rounded-full border border-date2-border bg-date2-white py-1 pl-1 pr-3 font-helvetica text-xs font-bold text-date2-ink shadow-sm transition-colors hover:bg-date2-lavenderMist focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
              : "inline-flex items-center gap-2 rounded-full border border-brand-border bg-white py-1 pl-1 pr-3 text-xs font-semibold text-brand-ink shadow-sm transition-colors hover:bg-brand-ice focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/30"
          }
        >
          <ProfileAvatar name={username ?? "Date²"} size="sm" />
          <span className="hidden sm:inline">
            {username ? `@${username}` : "Account"}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 text-date2-slate transition-transform ${
              menuOpen ? "rotate-180" : ""
            }`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Account menu"
            className="absolute right-0 z-40 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-date2-border bg-date2-white p-1.5 font-helvetica shadow-indigoCard"
          >
            {username && (
              <div className="border-b border-date2-border px-3 py-2">
                <p className="text-[11px] text-date2-slate">Signed in as</p>
                <p className="truncate text-xs font-bold text-date2-ink">
                  @{username}
                </p>
              </div>
            )}

            <div className="py-1">
              {showHomeLink && (
                <Link
                  href="/home"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-xl px-3 py-2 text-xs font-bold text-date2-ink transition-colors hover:bg-date2-lavenderMist"
                >
                  Home Dashboard
                </Link>
              )}
              <Link
                href="/onboarding/personal-info"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-xs font-bold text-date2-ink transition-colors hover:bg-date2-lavenderMist"
              >
                Profile &amp; Preferences
              </Link>
              <Link
                href="/security-check/status"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2 text-xs font-bold text-date2-ink transition-colors hover:bg-date2-lavenderMist"
              >
                Account Verification Status
              </Link>
            </div>

            <div className="border-t border-date2-border pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setLogoutError(null);
                  setConfirmOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50"
              >
                <span>Logout</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
                    clipRule="evenodd"
                  />
                  <path
                    fillRule="evenodd"
                    d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      {confirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-date2-midnight/55 p-4 font-helvetica backdrop-blur-sm"
        >
          <div className="w-full max-w-sm space-y-4 rounded-[24px] border border-date2-border bg-date2-white p-6 shadow-indigoCard">
            <div>
              <h2
                id="logout-confirm-title"
                className="text-lg font-bold text-date2-ink"
              >
                Are you sure you want to log out?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-date2-slate">
                Your session will end, active chats and calls will close, and
                any temporary Vanish Mode messages will be cleared.
              </p>
            </div>

            {logoutError && (
              <StatusBanner variant="error" message={logoutError} />
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-[14px] border border-date2-softBorder bg-date2-canvas px-4 py-2.5 text-sm font-bold text-date2-ink transition-colors hover:bg-date2-lavenderMist disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleConfirmLogout}
                className="flex-1 rounded-[14px] bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
