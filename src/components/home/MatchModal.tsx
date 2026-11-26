"use client";

import React, { useEffect } from "react";
import type { SwipeResponse } from "@/services/home/types";
import { ProfileAvatar } from "./ProfileAvatar";

interface MatchModalProps {
  match: SwipeResponse | null;
  currentUserName?: string;
  onStartChat: (conversationId?: string) => void;
  onContinue: () => void;
}

export function MatchModal({
  match,
  currentUserName = "You",
  onStartChat,
  onContinue,
}: MatchModalProps) {
  useEffect(() => {
    if (!match) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onContinue();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [match, onContinue]);

  if (!match || !match.matched) return null;

  const partnerName = match.matchedUser?.name ?? "Your match";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mutual-match-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-forest/45 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-6 text-center shadow-card sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-ice px-3.5 py-1 text-xs font-semibold text-brand-forest">
          <span className="h-2 w-2 rounded-full bg-brand-mint" />
          Mutual Match
        </span>

        <h2
          id="mutual-match-title"
          className="mt-4 text-2xl font-bold tracking-tight text-brand-ink"
        >
          It&apos;s a Match!
        </h2>
        <p className="mt-1.5 text-sm text-brand-muted">
          {match.message ?? `You and ${partnerName} liked each other on Date².`}
        </p>

        <div className="my-6 flex items-center justify-center gap-4">
          <ProfileAvatar
            name={currentUserName}
            photoUrl={match.currentUserPhotoUrl}
            size="lg"
          />
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-mint/25 text-brand-forest"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 21s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 11c0 5.5-7 10-7 10Z" />
            </svg>
          </span>
          <ProfileAvatar
            name={partnerName}
            photoUrl={match.matchedUser?.photoUrl}
            size="lg"
          />
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onStartChat(match.conversationId)}
            className="w-full rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            Start Chat
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-xl border border-brand-border bg-brand-ice/70 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
          >
            Continue Discovering
          </button>
        </div>
      </div>
    </div>
  );
}
