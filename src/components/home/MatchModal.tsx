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
      className="fixed inset-0 z-50 flex items-center justify-center bg-date2-ink/60 p-4 font-helvetica backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-[26px] border border-date2-softPeriwinkle/40 bg-gradient-to-br from-date2-midnight via-date2-deepIndigo to-date2-violet p-6 text-center text-date2-white shadow-indigoCard sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-date2-limeMark px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-date2-midnight">
          It&apos;s a Mutual Match
        </span>

        <div className="my-6 flex items-center justify-center gap-4">
          <div className="rounded-full ring-2 ring-date2-paleLavender">
            <ProfileAvatar
              name={currentUserName}
              photoUrl={match.currentUserPhotoUrl}
              size="lg"
            />
          </div>
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-date2-limeMark/70 bg-date2-midnight text-date2-limeMark shadow-indigoSoft"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 21s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 11c0 5.5-7 10-7 10Z" />
            </svg>
          </span>
          <div className="rounded-full ring-2 ring-date2-limeMark">
            <ProfileAvatar
              name={partnerName}
              photoUrl={match.matchedUser?.photoUrl}
              size="lg"
            />
          </div>
        </div>

        <h2
          id="mutual-match-title"
          className="text-xl font-bold tracking-tight text-date2-white sm:text-2xl"
        >
          You and {partnerName} liked each other
        </h2>
        <p className="mt-1.5 text-sm text-date2-paleLavender">
          {match.message ??
            "Start a conversation or continue discovering compatible matches on Date²."}
        </p>

        <div className="mt-7 space-y-2.5">
          <button
            type="button"
            onClick={() => onStartChat(match.conversationId)}
            className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-date2-limeMark px-5 text-sm font-bold text-date2-midnight shadow-indigoSoft transition-colors hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            <span>Send a Message</span>
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex h-[48px] w-full items-center justify-center rounded-[14px] border border-date2-paleLavender/40 bg-date2-white/10 px-5 text-sm font-bold text-date2-white transition-colors hover:bg-date2-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}
