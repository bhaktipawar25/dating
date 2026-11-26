"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import {
  MatchServiceError,
  matchService,
  type CandidateProfile,
  type SwipeAction,
  type SwipeResponse,
} from "@/services/home/matchService";
import { MatchModal } from "./MatchModal";

interface MatchSectionProps {
  isActive: boolean;
  currentUserName?: string;
  onMatchConfirmed: (response: SwipeResponse) => void;
  onOpenChatFromMatch: (conversationId?: string) => void;
}

const SWIPE_THRESHOLD_PX = 95;

export function MatchSection({
  isActive,
  currentUserName,
  onMatchConfirmed,
  onOpenChatFromMatch,
}: MatchSectionProps) {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showProfileDetails, setShowProfileDetails] = useState(false);

  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef<number | null>(null);

  const [matchModalData, setMatchModalData] = useState<SwipeResponse | null>(
    null
  );

  const loadDeck = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    setSwipeError(null);
    setShowProfileDetails(false);
    try {
      const response = await matchService.getDeck(signal);
      setCandidates(response.candidates ?? []);
      setIsMock(Boolean(response.isMockResponse));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setLoadError(
        err instanceof MatchServiceError
          ? err.message
          : "Unable to load potential matches right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDeck(controller.signal);
    return () => controller.abort();
  }, [loadDeck]);

  const currentCandidate = candidates[0] ?? null;

  const handleSwipe = useCallback(
    async (action: SwipeAction) => {
      if (!currentCandidate || isSwiping) return;

      setSwipeError(null);
      setIsSwiping(true);
      setDragOffsetX(action === "LIKE" ? 160 : -160);

      try {
        const result = await matchService.swipe({
          candidateId: currentCandidate.id,
          action,
        });
        setCandidates((prev) => prev.slice(1));
        setDragOffsetX(0);
        setShowProfileDetails(false);

        if (result.matched) {
          onMatchConfirmed(result);
          setMatchModalData(result);
        }
      } catch (err) {
        setDragOffsetX(0);
        setSwipeError(
          err instanceof MatchServiceError
            ? err.message
            : "Could not submit your choice. Please try again."
        );
      } finally {
        setIsSwiping(false);
      }
    },
    [currentCandidate, isSwiping, onMatchConfirmed]
  );

  useEffect(() => {
    if (!isActive || matchModalData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        void handleSwipe("DISLIKE");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        void handleSwipe("LIKE");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, matchModalData, handleSwipe]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isSwiping || !currentCandidate) return;
    dragStartXRef.current = e.clientX;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || dragStartXRef.current === null) return;
    setDragOffsetX(e.clientX - dragStartXRef.current);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartXRef.current = null;

    if (dragOffsetX >= SWIPE_THRESHOLD_PX) {
      void handleSwipe("LIKE");
    } else if (dragOffsetX <= -SWIPE_THRESHOLD_PX) {
      void handleSwipe("DISLIKE");
    } else {
      setDragOffsetX(0);
    }
  };

  const sharedSet = new Set(
    (currentCandidate?.sharedInterests ?? []).map((i) => i.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-xl space-y-5 font-helvetica">
      {isMock && (
        <StatusBanner
          variant="info"
          message="Showing local sample profiles for UI testing. Connect the Date² backend for live match discovery."
        />
      )}

      {loadError && (
        <StatusBanner
          variant="error"
          message={loadError}
          action={
            <button
              type="button"
              onClick={() => void loadDeck()}
              className="text-xs font-bold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      {swipeError && <StatusBanner variant="error" message={swipeError} />}

      {loading ? (
        <div className="space-y-4 rounded-[26px] border border-date2-border bg-date2-white p-6 shadow-indigoCard">
          <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-date2-surface" />
          <div className="h-6 w-40 animate-pulse rounded-lg bg-date2-lavenderMist" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-date2-canvas" />
          <div className="flex gap-2">
            <div className="h-7 w-20 animate-pulse rounded-full bg-date2-lavenderMist" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-date2-lavenderMist" />
          </div>
        </div>
      ) : !currentCandidate ? (
        <div className="space-y-4 rounded-[26px] border border-date2-border bg-date2-white p-8 text-center shadow-indigoCard">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-date2-lavenderMist text-date2-deepIndigo">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-8 w-8"
            >
              <path d="M12 20s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 5.5-7 10-7 10Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-date2-ink">
              You&apos;ve seen everyone for now!
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-date2-slate">
              Check back soon or refresh your discovery deck to explore more
              compatible profiles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDeck()}
            className="inline-flex h-[48px] items-center justify-center rounded-[14px] bg-date2-midnight px-6 text-sm font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo"
          >
            Refresh Deck
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Interactive Draggable Candidate Profile Card */}
          <article
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform: `translateX(${dragOffsetX}px) rotate(${
                dragOffsetX * 0.04
              }deg)`,
              transition: isDragging
                ? "none"
                : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="relative touch-pan-y select-none overflow-hidden rounded-[26px] border border-date2-border bg-date2-white shadow-indigoCard cursor-grab active:cursor-grabbing"
          >
            {/* Drag Direction Stamp Overlays */}
            {dragOffsetX > 35 && (
              <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-xl border-2 border-date2-limeMark bg-date2-midnight/95 px-3.5 py-1 text-xs font-bold tracking-wider text-date2-limeMark">
                LIKE
              </div>
            )}
            {dragOffsetX < -35 && (
              <div className="pointer-events-none absolute right-5 top-5 z-10 rounded-xl border-2 border-rose-400 bg-rose-600/95 px-3.5 py-1 text-xs font-bold tracking-wider text-white">
                PASS
              </div>
            )}

            {/* Profile Photo / Clean Portrait */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-date2-lavenderMist via-date2-paleLavender to-date2-softPeriwinkle/45">
              {currentCandidate.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentCandidate.photoUrl}
                  alt={currentCandidate.name}
                  className="pointer-events-none h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-date2-midnight">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-date2-white text-3xl font-bold shadow-indigoSoft">
                    {currentCandidate.name[0]?.toUpperCase() ?? "D"}
                  </span>
                  <span className="rounded-full bg-date2-white/90 px-3 py-1 text-xs font-bold text-date2-deepIndigo">
                    Verified Date² Member
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-date2-ink/85 via-date2-ink/40 to-transparent p-5 text-date2-white">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-2xl font-bold tracking-tight">
                        {currentCandidate.name}
                      </h2>
                      {currentCandidate.age !== undefined && (
                        <span className="text-xl font-normal opacity-95">
                          {currentCandidate.age}
                        </span>
                      )}
                    </div>

                    {(currentCandidate.location ||
                      currentCandidate.occupation) && (
                      <p className="mt-0.5 text-xs font-bold text-date2-paleLavender">
                        {[
                          currentCandidate.occupation,
                          currentCandidate.location,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setShowProfileDetails((prev) => !prev)}
                    className="shrink-0 rounded-full border border-date2-paleLavender/40 bg-date2-midnight/85 px-3 py-1.5 text-[11px] font-bold text-date2-white backdrop-blur-sm transition-colors hover:bg-date2-deepIndigo"
                  >
                    {showProfileDetails ? "Hide Info" : "Profile Info"}
                  </button>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="space-y-4 p-5 sm:p-6">
              {currentCandidate.bio && (
                <p
                  className={`text-sm leading-relaxed text-date2-charcoal ${
                    showProfileDetails ? "" : "line-clamp-3"
                  }`}
                >
                  {currentCandidate.bio}
                </p>
              )}

              {currentCandidate.interests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-muted">
                    Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentCandidate.interests.map((interest) => {
                      const isShared = sharedSet.has(interest.toLowerCase());
                      return (
                        <span
                          key={interest}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                            isShared
                              ? "bg-date2-midnight text-date2-white"
                              : "border border-date2-paleLavender bg-date2-lavenderMist text-date2-deepIndigo"
                          }`}
                        >
                          {isShared && (
                            <span
                              aria-hidden="true"
                              className="text-date2-limeMark"
                            >
                              ★
                            </span>
                          )}
                          <span>{interest}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {showProfileDetails && (
                <div className="grid grid-cols-2 gap-2.5 rounded-[16px] border border-date2-border bg-date2-surface p-3.5 text-xs">
                  <div>
                    <p className="font-bold text-date2-muted">Location</p>
                    <p className="mt-0.5 font-bold text-date2-ink">
                      {currentCandidate.location ?? "Nearby"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-date2-muted">Shared Vibes</p>
                    <p className="mt-0.5 font-bold text-date2-deepIndigo">
                      {currentCandidate.sharedInterests?.length ?? 0} interests
                    </p>
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Like / Dislike Controls + Keyboard Hint */}
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              disabled={isSwiping}
              aria-label="Dislike profile (Left arrow)"
              onClick={() => void handleSwipe("DISLIKE")}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-date2-border bg-date2-white text-rose-600 shadow-indigoSoft transition-all hover:scale-105 hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                className="h-6 w-6"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <button
              type="button"
              disabled={isSwiping}
              aria-label="Like profile (Right arrow)"
              onClick={() => void handleSwipe("LIKE")}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-date2-midnight text-date2-limeMark shadow-indigoCard transition-all hover:scale-105 hover:bg-date2-deepIndigo focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-7 w-7"
              >
                <path d="M12 21s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 11c0 5.5-7 10-7 10Z" />
              </svg>
            </button>
          </div>

          <p className="text-center text-xs text-date2-slate">
            Drag card or press{" "}
            <kbd className="rounded border border-date2-border bg-date2-white px-1.5 py-0.5 text-[11px] font-bold text-date2-ink">
              ←
            </kbd>{" "}
            to pass and{" "}
            <kbd className="rounded border border-date2-border bg-date2-white px-1.5 py-0.5 text-[11px] font-bold text-date2-ink">
              →
            </kbd>{" "}
            to like
          </p>
        </div>
      )}

      <MatchModal
        match={matchModalData}
        currentUserName={currentUserName}
        onStartChat={(convId) => {
          setMatchModalData(null);
          onOpenChatFromMatch(convId);
        }}
        onContinue={() => setMatchModalData(null)}
      />
    </div>
  );
}
