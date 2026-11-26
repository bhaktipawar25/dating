import type { AuthMode } from "@/services/auth/types";
import type { GameResultChatPayload } from "@/services/chat/types";

export type GameId = "trivia" | "two_truths_lie" | "compatibility_quiz";

export type GameConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface GameCatalogItem {
  id: GameId;
  name: string;
  description: string;
  estimatedTime?: string;
}

export interface GetGamesCatalogResponse {
  games: GameCatalogItem[];
  isMockResponse?: boolean;
}

export interface TriviaQuestion {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
}

export interface TwoTruthsRoundState {
  roundNumber: number;
  phase: "create" | "guess" | "result";
  authorId: string;
  authorName: string;
  statements?: string[];
  lieIndex?: number;
  guessedIndex?: number;
  wasCorrect?: boolean;
}

export interface CompatibilityQuestion {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
}

export interface GameSessionState {
  sessionId: string;
  gameId: GameId;
  conversationId: string;
  partnerName: string;
  currentTurnUserId: string;
  currentTurnLabel: string;
  isMyTurn: boolean;
  waitingForPartner: boolean;
  score: {
    me: number;
    partner: number;
  };
  progress: {
    current: number;
    total: number;
  };
  completed: boolean;
  finalResult?: GameResultChatPayload & {
    compatibilityPercent?: number;
  };
  trivia?: {
    question: TriviaQuestion;
    selectedOptionId?: string;
    feedback?: {
      isCorrect: boolean;
      correctOptionId?: string;
      message: string;
    };
  };
  twoTruths?: TwoTruthsRoundState;
  compatibility?: {
    question: CompatibilityQuestion;
    mySelectedOptionId?: string;
    partnerAnswered: boolean;
  };
}

export interface GameSocketHandlers {
  onStatusChange: (status: GameConnectionStatus) => void;
  onSessionUpdate: (state: GameSessionState) => void;
  onError?: (message: string) => void;
}

export interface GameSocketConnection {
  submitTriviaAnswer: (questionId: string, optionId: string) => void;
  submitTwoTruthsRound: (statements: [string, string, string], lieIndex: number) => void;
  submitTwoTruthsGuess: (guessedIndex: number) => void;
  submitCompatibilityAnswer: (questionId: string, optionId: string) => void;
  requestNextStep: () => void;
  restartGame: () => void;
  close: () => void;
}

export class GameServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
    }
  ) {
    super(message);
    this.name = "GameServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "GAME_ERROR";
  }
}

export interface GameService {
  readonly mode: AuthMode;
  getCatalog(signal?: AbortSignal): Promise<GetGamesCatalogResponse>;
  connectGameSession(
    params: {
      gameId: GameId;
      conversationId: string;
      partnerName: string;
    },
    handlers: GameSocketHandlers
  ): GameSocketConnection;
}
