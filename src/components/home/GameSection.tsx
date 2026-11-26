"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import type { ChatConversation } from "@/services/chat/types";
import {
  GameServiceError,
  gameService,
  type GameCatalogItem,
  type GameConnectionStatus,
  type GameId,
  type GameSessionState,
  type GameSocketConnection,
} from "@/services/games/gameService";
import { CompatibilityQuizGame } from "./games/CompatibilityQuizGame";
import { TriviaGame } from "./games/TriviaGame";
import { TwoTruthsLieGame } from "./games/TwoTruthsLieGame";

interface GameSectionProps {
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onGoToMatch: () => void;
  onReturnToChat: (conversationId: string) => void;
  onGameCompleted: () => void;
}

function GameCardIcon({ id }: { id: GameId }) {
  switch (id) {
    case "trivia":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
          <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "two_truths_lie":
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
        >
          <path d="M9 11l2 2 4-4" />
          <rect x="3" y="4" width="18" height="16" rx="3" />
        </svg>
      );
    case "compatibility_quiz":
    default:
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
        >
          <path d="M12 20s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 5.5-7 10-7 10Z" />
        </svg>
      );
  }
}

export function GameSection({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onGoToMatch,
  onReturnToChat,
  onGameCompleted,
}: GameSectionProps) {
  const [catalog, setCatalog] = useState<GameCatalogItem[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [activeGame, setActiveGame] = useState<GameCatalogItem | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<GameConnectionStatus>("disconnected");
  const [sessionState, setSessionState] = useState<GameSessionState | null>(
    null
  );
  const [sessionError, setSessionError] = useState<string | null>(null);

  const socketRef = useRef<GameSocketConnection | null>(null);
  const notifiedCompletionRef = useRef<string | null>(null);

  const activePartnerConversation =
    conversations.find((c) => c.id === selectedConversationId) ??
    conversations[0] ??
    null;

  const loadCatalog = useCallback(async (signal?: AbortSignal) => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const response = await gameService.getCatalog(signal);
      setCatalog(response.games ?? []);
      setIsMock(Boolean(response.isMockResponse));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setCatalogError(
        err instanceof GameServiceError
          ? err.message
          : "Unable to load available games right now."
      );
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCatalog(controller.signal);
    return () => controller.abort();
  }, [loadCatalog]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const handleStartGame = (game: GameCatalogItem) => {
    if (!activePartnerConversation) return;

    socketRef.current?.close();
    setActiveGame(game);
    setSessionState(null);
    setSessionError(null);
    notifiedCompletionRef.current = null;

    socketRef.current = gameService.connectGameSession(
      {
        gameId: game.id,
        conversationId: activePartnerConversation.id,
        partnerName: activePartnerConversation.participant.name,
      },
      {
        onStatusChange: setConnectionStatus,
        onSessionUpdate: (nextState) => {
          setSessionState(nextState);
          if (
            nextState.completed &&
            notifiedCompletionRef.current !== nextState.sessionId
          ) {
            notifiedCompletionRef.current = nextState.sessionId;
            onGameCompleted();
          }
        },
        onError: (msg) => setSessionError(msg),
      }
    );
  };

  const handleLeaveGame = () => {
    socketRef.current?.close();
    socketRef.current = null;
    setActiveGame(null);
    setSessionState(null);
    setSessionError(null);
  };

  if (conversations.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-brand-border bg-white p-8 text-center shadow-card space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ice text-brand-forest">
          <GameCardIcon id="trivia" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-ink">
            Match with someone to play games
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            Games are played together with your matched connections, and final
            results are shared straight into your chat.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToMatch}
          className="inline-flex items-center justify-center rounded-xl bg-brand-forest px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover"
        >
          Discover Matches
        </button>
      </div>
    );
  }

  // Active Game Session View
  if (activeGame && activePartnerConversation) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white px-5 py-3.5 shadow-soft">
          <div>
            <p className="text-xs font-medium text-brand-muted">
              Playing with {activePartnerConversation.participant.name}
            </p>
            <h2 className="text-base font-bold text-brand-ink">
              {activeGame.name}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-ice px-2.5 py-1 text-[11px] font-semibold text-brand-forest">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-brand-mint"
                    : connectionStatus === "connecting" ||
                        connectionStatus === "reconnecting"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-rose-500"
                }`}
              />
              {connectionStatus === "connected"
                ? "Synced"
                : connectionStatus === "reconnecting"
                  ? "Reconnecting"
                  : connectionStatus === "connecting"
                    ? "Connecting"
                    : "Disconnected"}
            </span>

            <button
              type="button"
              onClick={handleLeaveGame}
              className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-forest hover:bg-brand-ice"
            >
              All Games
            </button>
          </div>
        </div>

        {sessionError && <StatusBanner variant="error" message={sessionError} />}

        <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-card sm:p-8">
          {!sessionState ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-mint border-t-brand-forest" />
              <p className="text-sm font-medium text-brand-muted">
                Connecting to your {activeGame.name} session...
              </p>
            </div>
          ) : sessionState.completed && sessionState.finalResult ? (
            <div className="space-y-5 text-center">
              <span className="inline-flex rounded-full bg-brand-ice px-3.5 py-1 text-xs font-semibold text-brand-forest">
                Game Finished
              </span>
              <h3 className="text-2xl font-bold text-brand-ink">
                {sessionState.finalResult.scoreLabel ??
                  sessionState.finalResult.gameName}
              </h3>
              <p className="text-sm text-brand-muted">
                {sessionState.finalResult.summary}
              </p>

              <StatusBanner
                variant="success"
                message={`Result posted to your chat with ${activePartnerConversation.participant.name}.`}
              />

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    onReturnToChat(activePartnerConversation.id)
                  }
                  className="flex-1 rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover"
                >
                  Return to Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    notifiedCompletionRef.current = null;
                    socketRef.current?.restartGame();
                  }}
                  className="flex-1 rounded-xl border border-brand-border bg-brand-ice/75 px-4 py-3 text-sm font-semibold text-brand-forest transition-colors hover:bg-brand-frost"
                >
                  Play Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Score & Turn Status Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-border/80 bg-brand-ice/55 px-4 py-3 text-xs">
                <span className="font-semibold text-brand-forest">
                  {sessionState.currentTurnLabel}
                </span>

                {activeGame.id !== "compatibility_quiz" && (
                  <span className="font-semibold text-brand-ink">
                    Score: You {sessionState.score.me} –{" "}
                    {sessionState.score.partner}{" "}
                    {activePartnerConversation.participant.name}
                  </span>
                )}
              </div>

              {activeGame.id === "trivia" && (
                <TriviaGame
                  session={sessionState}
                  onSubmitAnswer={(qId, optId) =>
                    socketRef.current?.submitTriviaAnswer(qId, optId)
                  }
                />
              )}

              {activeGame.id === "two_truths_lie" && (
                <TwoTruthsLieGame
                  session={sessionState}
                  onSubmitRound={(stmts, lieIdx) =>
                    socketRef.current?.submitTwoTruthsRound(stmts, lieIdx)
                  }
                  onSubmitGuess={(idx) =>
                    socketRef.current?.submitTwoTruthsGuess(idx)
                  }
                  onNextStep={() => socketRef.current?.requestNextStep()}
                />
              )}

              {activeGame.id === "compatibility_quiz" && (
                <CompatibilityQuizGame
                  session={sessionState}
                  onSubmitAnswer={(qId, optId) =>
                    socketRef.current?.submitCompatibilityAnswer(qId, optId)
                  }
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Games Catalog View
  return (
    <div className="space-y-5">
      {isMock && (
        <StatusBanner
          variant="info"
          message="Local test game mode active. Connect the Date² backend (GET /v1/games/catalog & WS /v1/games/play) for real-time partner gameplay."
        />
      )}

      {catalogError && (
        <StatusBanner
          variant="error"
          message={catalogError}
          action={
            <button
              type="button"
              onClick={() => loadCatalog()}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      {/* Matched Partner Selector */}
      <div className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-brand-ink">
            Play with a Match
          </h2>
          <p className="text-xs text-brand-muted">
            Choose a matched conversation to start a synchronized mini-game.
          </p>
        </div>

        <select
          aria-label="Select matched partner to play with"
          value={activePartnerConversation?.id ?? ""}
          onChange={(e) => onSelectConversation(e.target.value)}
          className="auth-input-base sm:w-64"
        >
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.participant.name}
              {c.participant.location ? ` (${c.participant.location})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Game Catalog Grid */}
      {loadingCatalog ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-52 animate-pulse rounded-3xl border border-brand-border bg-white p-6"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {catalog.map((game) => (
            <div
              key={game.id}
              className="flex flex-col justify-between rounded-3xl border border-brand-border bg-white p-6 shadow-card transition-all hover:border-brand-mint"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-ice text-brand-forest">
                    <GameCardIcon id={game.id} />
                  </span>
                  {game.estimatedTime && (
                    <span className="rounded-full bg-brand-canvas px-2.5 py-1 text-[11px] font-semibold text-brand-muted">
                      {game.estimatedTime}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-brand-ink">
                    {game.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-brand-muted">
                    {game.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleStartGame(game)}
                className="mt-6 w-full rounded-xl bg-brand-forest px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
              >
                Play {game.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
