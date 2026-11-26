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

  // Drag gesture state
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
    loadDeck(controller.signal);
    return () => controller.abort();
  }, [loadDeck]);

  const currentCandidate = candidates[0] ?? null;

  const handleSwipe = useCallback(
    async (action: SwipeAction) => {
      if (!currentCandidate || isSwiping) return;

      setSwipeError(null);
      setIsSwiping(true);
      // Animate exit slightly before removing
      setDragOffsetX(action === "LIKE" ? 160 : -160);

      try {
        const result = await matchService.swipe({
          candidateId: currentCandidate.id,
          action,
        });
        setCandidates((prev) => prev.slice(1));
        setDragOffsetX(0);

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

  // Keyboard shortcuts (Left = Dislike, Right = Like), guarded against typing
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
        handleSwipe("DISLIKE");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSwipe("LIKE");
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
      handleSwipe("LIKE");
    } else if (dragOffsetX <= -SWIPE_THRESHOLD_PX) {
      handleSwipe("DISLIKE");
    } else {
      setDragOffsetX(0);
    }
  };

  const sharedSet = new Set(
    (currentCandidate?.sharedInterests ?? []).map((i) => i.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {isMock && (
        <StatusBanner
          variant="info"
          message="Showing sample profiles for local frontend testing. Connect the Date² backend for live match discovery."
        />
      )}

      {loadError && (
        <StatusBanner
          variant="error"
          message={loadError}
          action={
            <button
              type="button"
              onClick={() => loadDeck()}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      {swipeError && <StatusBanner variant="error" message={swipeError} />}

      {loading ? (
        <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-card space-y-4">
          <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-brand-ice" />
          <div className="h-6 w-40 animate-pulse rounded-lg bg-brand-ice" />
          <div className="h-4 w-full animate-pulse rounded-lg bg-brand-canvas" />
          <div className="flex gap-2">
            <div className="h-7 w-20 animate-pulse rounded-full bg-brand-ice" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-brand-ice" />
          </div>
        </div>
      ) : !currentCandidate ? (
        <div className="rounded-3xl border border-brand-border bg-white p-8 text-center shadow-card space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ice text-brand-forest">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7"
            >
              <path d="M12 20s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 5.5-7 10-7 10Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-ink">
              You&apos;re caught up for now
            </h2>
            <p className="mt-1 text-sm text-brand-muted">
              No more profiles are currently in your deck. Refresh to check for
              new matches.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadDeck()}
            className="inline-flex items-center justify-center rounded-xl bg-brand-forest px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover"
          >
            Refresh Deck
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Interactive Draggable Candidate Card */}
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
            className="relative cursor-grab select-none touch-pan-y overflow-hidden rounded-3xl border border-brand-border bg-white shadow-card active:cursor-grabbing"
          >
            {/* Drag Direction Overlay Pills */}
            {dragOffsetX > 35 && (
              <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-xl border-2 border-brand-mint bg-brand-forest/90 px-3 py-1 text-xs font-bold tracking-wider text-white">
                LIKE
              </div>
            )}
            {dragOffsetX < -35 && (
              <div className="pointer-events-none absolute right-5 top-5 z-10 rounded-xl border-2 border-rose-400 bg-rose-600/90 px-3 py-1 text-xs font-bold tracking-wider text-white">
                PASS
              </div>
            )}

            {/* Profile Photo or Clean Monogram Portrait */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-brand-ice via-brand-frost to-brand-seafoam/60">
              {currentCandidate.photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentCandidate.photoUrl}
                  alt={currentCandidate.name}
                  className="h-full w-full object-cover pointer-events-none"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-forest">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-3xl font-bold shadow-soft">
                    {currentCandidate.name[0]?.toUpperCase() ?? "D"}
                  </span>
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand-muted">
                    Profile Photo
                  </span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/80 via-brand-ink/35 to-transparent p-5 text-white">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-bold tracking-tight">
                    {currentCandidate.name}
                  </h2>
                  {currentCandidate.age !== undefined && (
                    <span className="text-xl font-medium opacity-95">
                      {currentCandidate.age}
                    </span>
                  )}
                </div>

                {(currentCandidate.location || currentCandidate.occupation) && (
                  <p className="mt-0.5 text-xs font-medium text-white/90">
                    {[currentCandidate.occupation, currentCandidate.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="space-y-4 p-5 sm:p-6">
              {currentCandidate.bio && (
                <p className="text-sm leading-relaxed text-brand-ink">
                  {currentCandidate.bio}
                </p>
              )}

              {currentCandidate.interests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
                    Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentCandidate.interests.map((interest) => {
                      const isShared = sharedSet.has(interest.toLowerCase());
                      return (
                        <span
                          key={interest}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                            isShared
                              ? "bg-brand-forest text-white"
                              : "border border-brand-border bg-brand-ice/75 text-brand-forest"
                          }`}
                        >
                          {isShared && <span aria-hidden="true">★</span>}
                          <span>{interest}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </article>

          {/* Like / Dislike Controls + Keyboard Hint */}
          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              disabled={isSwiping}
              aria-label="Dislike profile (Left arrow)"
              onClick={() => handleSwipe("DISLIKE")}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-border bg-white text-rose-600 shadow-soft transition-all hover:scale-105 hover:border-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:opacity-50"
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
              onClick={() => handleSwipe("LIKE")}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-forest text-brand-mint shadow-card transition-all hover:scale-105 hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/40 disabled:opacity-50"
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

          <p className="text-center text-xs text-brand-muted">
            Drag card or press <kbd className="rounded border border-brand-border bg-white px-1.5 py-0.5 text-[11px] font-semibold">←</kbd> to pass and{" "}
            <kbd className="rounded border border-brand-border bg-white px-1.5 py-0.5 text-[11px] font-semibold">→</kbd> to like
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
