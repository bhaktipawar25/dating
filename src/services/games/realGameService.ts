import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { authHttpRequest } from "@/services/auth/httpClient";
import { AuthServiceError } from "@/services/auth/types";
import { GAME_ENDPOINTS } from "./endpoints";
import {
  GameServiceError,
  type GameId,
  type GameService,
  type GameSessionState,
  type GameSocketConnection,
  type GameSocketHandlers,
  type GetGamesCatalogResponse,
} from "./types";

function buildGameWebSocketUrl(params: {
  gameId: GameId;
  conversationId: string;
}): string {
  const query = new URLSearchParams({
    gameId: params.gameId,
    conversationId: params.conversationId,
  }).toString();

  if (AUTH_CONFIG.apiBaseUrl) {
    const base = new URL(AUTH_CONFIG.apiBaseUrl);
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    base.pathname = GAME_ENDPOINTS.play;
    base.search = query;
    return base.toString();
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${GAME_ENDPOINTS.play}?${query}`;
  }

  return `${GAME_ENDPOINTS.play}?${query}`;
}

export const realGameService: GameService = {
  mode: "api",

  async getCatalog(signal?: AbortSignal): Promise<GetGamesCatalogResponse> {
    try {
      return await authHttpRequest<GetGamesCatalogResponse>(
        GAME_ENDPOINTS.catalog,
        {
          method: "GET",
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      if (err instanceof AuthServiceError) {
        throw new GameServiceError(err.message, {
          status: err.status,
          code: err.code,
        });
      }
      throw new GameServiceError("Unable to load games catalog right now.", {
        status: 0,
        code: "GAME_CATALOG_ERROR",
      });
    }
  },

  connectGameSession(
    params: {
      gameId: GameId;
      conversationId: string;
      partnerName: string;
    },
    handlers: GameSocketHandlers
  ): GameSocketConnection {
    let socket: WebSocket | null = null;
    let intentionallyClosed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const sendPayload = (payload: Record<string, unknown>) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        handlers.onError?.(
          "Game connection is temporarily disconnected. Reconnecting..."
        );
        return;
      }
      socket.send(JSON.stringify(payload));
    };

    const connect = () => {
      if (intentionallyClosed || typeof WebSocket === "undefined") {
        return;
      }

      handlers.onStatusChange(
        reconnectAttempt > 0 ? "reconnecting" : "connecting"
      );

      try {
        socket = new WebSocket(
          buildGameWebSocketUrl({
            gameId: params.gameId,
            conversationId: params.conversationId,
          })
        );
      } catch {
        handlers.onStatusChange("error");
        handlers.onError?.("Unable to connect to the real-time game server.");
        return;
      }

      socket.onopen = () => {
        reconnectAttempt = 0;
        handlers.onStatusChange("connected");
        sendPayload({
          type: "join",
          gameId: params.gameId,
          conversationId: params.conversationId,
        });
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as {
            type?: string;
            state?: GameSessionState;
            message?: string;
          };
          if (parsed.type === "error") {
            handlers.onError?.(
              parsed.message || "Game action failed. Please try again."
            );
            return;
          }
          if (parsed.state) {
            handlers.onSessionUpdate(parsed.state);
          }
        } catch {
          // Ignore non-JSON frames safely
        }
      };

      socket.onerror = () => {
        handlers.onStatusChange("error");
      };

      socket.onclose = () => {
        if (intentionallyClosed) {
          handlers.onStatusChange("disconnected");
          return;
        }
        handlers.onStatusChange("reconnecting");
        const delayMs = Math.min(15000, 1000 * 2 ** reconnectAttempt);
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return {
      submitTriviaAnswer: (questionId, optionId) =>
        sendPayload({
          type: "trivia_answer",
          gameId: params.gameId,
          conversationId: params.conversationId,
          questionId,
          optionId,
        }),
      submitTwoTruthsRound: (statements, lieIndex) =>
        sendPayload({
          type: "two_truths_submit",
          gameId: params.gameId,
          conversationId: params.conversationId,
          statements,
          lieIndex,
        }),
      submitTwoTruthsGuess: (guessedIndex) =>
        sendPayload({
          type: "two_truths_guess",
          gameId: params.gameId,
          conversationId: params.conversationId,
          guessedIndex,
        }),
      submitCompatibilityAnswer: (questionId, optionId) =>
        sendPayload({
          type: "compatibility_answer",
          gameId: params.gameId,
          conversationId: params.conversationId,
          questionId,
          optionId,
        }),
      requestNextStep: () =>
        sendPayload({
          type: "next_step",
          gameId: params.gameId,
          conversationId: params.conversationId,
        }),
      restartGame: () =>
        sendPayload({
          type: "restart",
          gameId: params.gameId,
          conversationId: params.conversationId,
        }),
      close: () => {
        intentionallyClosed = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        socket?.close();
        socket = null;
        handlers.onStatusChange("disconnected");
      },
    };
  },
};
