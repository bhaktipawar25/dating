import { postMockGameResultToChat } from "@/services/chat/mockChatService";
import type {
  GameCatalogItem,
  GameId,
  GameService,
  GameSessionState,
  GameSocketConnection,
  GameSocketHandlers,
  GetGamesCatalogResponse,
} from "./types";

const MOCK_GAME_CATALOG: GameCatalogItem[] = [
  {
    id: "trivia",
    name: "Trivia",
    description:
      "Take turns answering light-hearted questions and see who racks up the highest score.",
    estimatedTime: "2–3 min",
  },
  {
    id: "two_truths_lie",
    name: "Two Truths & a Lie",
    description:
      "Share three statements about yourself and challenge your match to spot the lie.",
    estimatedTime: "3–4 min",
  },
  {
    id: "compatibility_quiz",
    name: "Compatibility Quiz",
    description:
      "Answer quick lifestyle and dating prompts together to reveal your shared vibe.",
    estimatedTime: "2–3 min",
  },
];

const MOCK_TRIVIA_QUESTIONS = [
  {
    id: "triv-1",
    prompt: "Which city is famous for its iconic tram cars and Golden Gate Bridge?",
    options: [
      { id: "a", label: "San Francisco" },
      { id: "b", label: "Seattle" },
      { id: "c", label: "Boston" },
      { id: "d", label: "Chicago" },
    ],
    correctId: "a",
  },
  {
    id: "triv-2",
    prompt: "Which hot drink is traditionally brewed using a South Indian brass filter?",
    options: [
      { id: "a", label: "Matcha Latte" },
      { id: "b", label: "Filter Kaapi" },
      { id: "c", label: "Turkish Tea" },
      { id: "d", label: "Cold Brew" },
    ],
    correctId: "b",
  },
  {
    id: "triv-3",
    prompt: "How many strings does a standard acoustic guitar have?",
    options: [
      { id: "a", label: "4" },
      { id: "b", label: "5" },
      { id: "c", label: "6" },
      { id: "d", label: "8" },
    ],
    correctId: "c",
  },
];

const MOCK_COMPATIBILITY_QUESTIONS = [
  {
    id: "compat-1",
    prompt: "Your ideal Sunday morning looks like:",
    options: [
      { id: "a", label: "Slow coffee & a walk outdoors" },
      { id: "b", label: "Cooking brunch with music on" },
      { id: "c", label: "Spontaneous road trip" },
      { id: "d", label: "Cozy movie marathon" },
    ],
  },
  {
    id: "compat-2",
    prompt: "Pick a first-date vibe you never get tired of:",
    options: [
      { id: "a", label: "Quiet cafe conversation" },
      { id: "b", label: "Street food & night market" },
      { id: "c", label: "Live music or comedy show" },
      { id: "d", label: "Art gallery & evening stroll" },
    ],
  },
  {
    id: "compat-3",
    prompt: "When planning a trip together, you prefer:",
    options: [
      { id: "a", label: "Detailed itinerary" },
      { id: "b", label: "Loose plan with room to explore" },
      { id: "c", label: "Total spontaneity" },
      { id: "d", label: "Relaxing at one spot" },
    ],
  },
];

const MOCK_PARTNER_TWO_TRUTHS = {
  statements: [
    "I once missed a flight because I got distracted at a bookstore.",
    "I can solve a Rubik's cube in under a minute.",
    "I've never drunk a full cup of coffee in my life.",
  ],
  lieIndex: 2,
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Isolated mock game service for local frontend testing when the backend
 * game catalog & WebSocket service are unavailable.
 */
export const mockGameService: GameService = {
  mode: "mock",

  async getCatalog(signal?: AbortSignal): Promise<GetGamesCatalogResponse> {
    await delay(180, signal);
    return {
      games: MOCK_GAME_CATALOG,
      isMockResponse: true,
    };
  },

  connectGameSession(
    params: {
      gameId: GameId;
      conversationId: string;
      partnerName: string;
    },
    handlers: GameSocketHandlers
  ): GameSocketConnection {
    let closed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const createInitialState = (): GameSessionState => {
      if (params.gameId === "trivia") {
        const q = MOCK_TRIVIA_QUESTIONS[0];
        return {
          sessionId: `mock-session-${Date.now()}`,
          gameId: "trivia",
          conversationId: params.conversationId,
          partnerName: params.partnerName,
          currentTurnUserId: "current-user",
          currentTurnLabel: "Your turn",
          isMyTurn: true,
          waitingForPartner: false,
          score: { me: 0, partner: 0 },
          progress: { current: 1, total: MOCK_TRIVIA_QUESTIONS.length },
          completed: false,
          trivia: {
            question: {
              id: q.id,
              prompt: q.prompt,
              options: q.options,
            },
          },
        };
      }

      if (params.gameId === "two_truths_lie") {
        return {
          sessionId: `mock-session-${Date.now()}`,
          gameId: "two_truths_lie",
          conversationId: params.conversationId,
          partnerName: params.partnerName,
          currentTurnUserId: "current-user",
          currentTurnLabel: "Your turn to share 3 statements",
          isMyTurn: true,
          waitingForPartner: false,
          score: { me: 0, partner: 0 },
          progress: { current: 1, total: 2 },
          completed: false,
          twoTruths: {
            roundNumber: 1,
            phase: "create",
            authorId: "current-user",
            authorName: "You",
          },
        };
      }

      const cq = MOCK_COMPATIBILITY_QUESTIONS[0];
      return {
        sessionId: `mock-session-${Date.now()}`,
        gameId: "compatibility_quiz",
        conversationId: params.conversationId,
        partnerName: params.partnerName,
        currentTurnUserId: "current-user",
        currentTurnLabel: "Your turn",
        isMyTurn: true,
        waitingForPartner: false,
        score: { me: 0, partner: 0 },
        progress: { current: 1, total: MOCK_COMPATIBILITY_QUESTIONS.length },
        completed: false,
        compatibility: {
          question: cq,
          partnerAnswered: false,
        },
      };
    };

    let state = createInitialState();
    let compatMatches = 0;

    const emit = (next: GameSessionState) => {
      if (closed) return;
      state = next;
      handlers.onSessionUpdate(next);
    };

    handlers.onStatusChange("connecting");
    timers.push(
      setTimeout(() => {
        if (closed) return;
        handlers.onStatusChange("connected");
        emit(state);
      }, 180)
    );

    return {
      submitTriviaAnswer: (questionId, optionId) => {
        if (closed || state.completed || !state.isMyTurn) return;
        const idx = MOCK_TRIVIA_QUESTIONS.findIndex((q) => q.id === questionId);
        const currentQ = MOCK_TRIVIA_QUESTIONS[idx] ?? MOCK_TRIVIA_QUESTIONS[0];
        const isCorrect = currentQ.correctId === optionId;
        const nextMyScore = state.score.me + (isCorrect ? 1 : 0);

        emit({
          ...state,
          isMyTurn: false,
          waitingForPartner: true,
          currentTurnLabel: `Waiting for ${params.partnerName}...`,
          score: { ...state.score, me: nextMyScore },
          trivia: {
            question: {
              id: currentQ.id,
              prompt: currentQ.prompt,
              options: currentQ.options,
            },
            selectedOptionId: optionId,
            feedback: {
              isCorrect,
              correctOptionId: currentQ.correctId,
              message: isCorrect
                ? "Correct answer!"
                : "Not quite — good try!",
            },
          },
        });

        timers.push(
          setTimeout(() => {
            if (closed) return;
            const partnerGotPoint = idx % 2 === 0 ? 1 : 0;
            const nextPartnerScore = state.score.partner + partnerGotPoint;
            const nextIdx = idx + 1;

            if (nextIdx >= MOCK_TRIVIA_QUESTIONS.length) {
              const finalResult = {
                gameId: "trivia" as const,
                gameName: "Trivia",
                scoreLabel: `${nextMyScore} – ${nextPartnerScore}`,
                summary: `Final score: You ${nextMyScore}, ${params.partnerName} ${nextPartnerScore}.`,
              };
              postMockGameResultToChat(params.conversationId, finalResult);
              emit({
                ...state,
                isMyTurn: false,
                waitingForPartner: false,
                currentTurnLabel: "Game complete",
                score: { me: nextMyScore, partner: nextPartnerScore },
                completed: true,
                finalResult,
              });
              return;
            }

            const nextQ = MOCK_TRIVIA_QUESTIONS[nextIdx];
            emit({
              ...state,
              isMyTurn: true,
              waitingForPartner: false,
              currentTurnLabel: "Your turn",
              score: { me: nextMyScore, partner: nextPartnerScore },
              progress: {
                current: nextIdx + 1,
                total: MOCK_TRIVIA_QUESTIONS.length,
              },
              trivia: {
                question: {
                  id: nextQ.id,
                  prompt: nextQ.prompt,
                  options: nextQ.options,
                },
              },
            });
          }, 900)
        );
      },

      submitTwoTruthsRound: (statements, lieIndex) => {
        if (closed || state.completed || state.twoTruths?.phase !== "create") {
          return;
        }

        emit({
          ...state,
          isMyTurn: false,
          waitingForPartner: true,
          currentTurnLabel: `Waiting for ${params.partnerName} to guess...`,
          twoTruths: {
            roundNumber: 1,
            phase: "result",
            authorId: "current-user",
            authorName: "You",
            statements: [...statements],
            lieIndex,
          },
        });

        timers.push(
          setTimeout(() => {
            if (closed) return;
            const simulatedGuess = lieIndex === 0 ? 1 : lieIndex;
            const partnerCorrect = simulatedGuess === lieIndex;
            const nextScore = {
              me: state.score.me + (partnerCorrect ? 0 : 1),
              partner: state.score.partner + (partnerCorrect ? 1 : 0),
            };

            emit({
              ...state,
              isMyTurn: false,
              waitingForPartner: false,
              currentTurnLabel: `${params.partnerName} guessed`,
              score: nextScore,
              twoTruths: {
                roundNumber: 1,
                phase: "result",
                authorId: "current-user",
                authorName: "You",
                statements: [...statements],
                lieIndex,
                guessedIndex: simulatedGuess,
                wasCorrect: partnerCorrect,
              },
            });
          }, 1000)
        );
      },

      submitTwoTruthsGuess: (guessedIndex) => {
        if (closed || state.completed || state.twoTruths?.phase !== "guess") {
          return;
        }
        const wasCorrect = guessedIndex === MOCK_PARTNER_TWO_TRUTHS.lieIndex;
        const nextScore = {
          me: state.score.me + (wasCorrect ? 1 : 0),
          partner: state.score.partner + (wasCorrect ? 0 : 1),
        };

        const finalResult = {
          gameId: "two_truths_lie" as const,
          gameName: "Two Truths & a Lie",
          scoreLabel: `${nextScore.me} – ${nextScore.partner}`,
          summary: wasCorrect
            ? `You spotted ${params.partnerName}'s lie! Final score: ${nextScore.me} – ${nextScore.partner}.`
            : `${params.partnerName} fooled you on the final round! Final score: ${nextScore.me} – ${nextScore.partner}.`,
        };
        postMockGameResultToChat(params.conversationId, finalResult);

        emit({
          ...state,
          isMyTurn: false,
          waitingForPartner: false,
          currentTurnLabel: "Game complete",
          score: nextScore,
          completed: true,
          finalResult,
          twoTruths: {
            roundNumber: 2,
            phase: "result",
            authorId: "partner",
            authorName: params.partnerName,
            statements: MOCK_PARTNER_TWO_TRUTHS.statements,
            lieIndex: MOCK_PARTNER_TWO_TRUTHS.lieIndex,
            guessedIndex,
            wasCorrect,
          },
        });
      },

      submitCompatibilityAnswer: (questionId, optionId) => {
        if (closed || state.completed || !state.isMyTurn) return;
        const idx = MOCK_COMPATIBILITY_QUESTIONS.findIndex(
          (q) => q.id === questionId
        );
        const currentQ =
          MOCK_COMPATIBILITY_QUESTIONS[idx] ?? MOCK_COMPATIBILITY_QUESTIONS[0];

        emit({
          ...state,
          isMyTurn: false,
          waitingForPartner: true,
          currentTurnLabel: `Waiting for ${params.partnerName}...`,
          compatibility: {
            question: currentQ,
            mySelectedOptionId: optionId,
            partnerAnswered: false,
          },
        });

        timers.push(
          setTimeout(() => {
            if (closed) return;
            if (optionId === "a" || optionId === "b") {
              compatMatches += 1;
            }
            const nextIdx = idx + 1;
            if (nextIdx >= MOCK_COMPATIBILITY_QUESTIONS.length) {
              const percent = Math.min(96, 62 + compatMatches * 11);
              const finalResult = {
                gameId: "compatibility_quiz" as const,
                gameName: "Compatibility Quiz",
                scoreLabel: `${percent}% Match`,
                compatibilityPercent: percent,
                summary: `Compatibility result: ${percent}% shared vibe with ${params.partnerName} (simulated test score).`,
              };
              postMockGameResultToChat(params.conversationId, finalResult);
              emit({
                ...state,
                isMyTurn: false,
                waitingForPartner: false,
                currentTurnLabel: "Quiz complete",
                completed: true,
                finalResult,
                compatibility: {
                  question: currentQ,
                  mySelectedOptionId: optionId,
                  partnerAnswered: true,
                },
              });
              return;
            }

            const nextQ = MOCK_COMPATIBILITY_QUESTIONS[nextIdx];
            emit({
              ...state,
              isMyTurn: true,
              waitingForPartner: false,
              currentTurnLabel: "Your turn",
              progress: {
                current: nextIdx + 1,
                total: MOCK_COMPATIBILITY_QUESTIONS.length,
              },
              compatibility: {
                question: nextQ,
                partnerAnswered: false,
              },
            });
          }, 850)
        );
      },

      requestNextStep: () => {
        if (closed) return;
        if (
          params.gameId === "two_truths_lie" &&
          state.twoTruths?.roundNumber === 1 &&
          state.twoTruths?.phase === "result"
        ) {
          emit({
            ...state,
            isMyTurn: true,
            waitingForPartner: false,
            currentTurnLabel: `Your turn to spot ${params.partnerName}'s lie`,
            progress: { current: 2, total: 2 },
            twoTruths: {
              roundNumber: 2,
              phase: "guess",
              authorId: "partner",
              authorName: params.partnerName,
              statements: MOCK_PARTNER_TWO_TRUTHS.statements,
            },
          });
        }
      },

      restartGame: () => {
        if (closed) return;
        compatMatches = 0;
        emit(createInitialState());
      },

      close: () => {
        closed = true;
        timers.forEach(clearTimeout);
        handlers.onStatusChange("disconnected");
      },
    };
  },
};
