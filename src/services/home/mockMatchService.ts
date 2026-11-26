import { addMockConversationFromMatch } from "@/services/chat/mockChatService";
import type {
  CandidateProfile,
  MatchDeckResponse,
  MatchService,
  SwipeRequest,
  SwipeResponse,
} from "./types";

const MOCK_CANDIDATES: CandidateProfile[] = [
  {
    id: "cand-1",
    name: "Aarav",
    age: 26,
    location: "Bengaluru",
    occupation: "Product Designer",
    bio: "Weekend filter coffee explorer, acoustic guitar tinkerer, and mountain trail regular.",
    interests: ["Coffee", "Playing Instruments", "Mountains", "Photography", "Badminton"],
    sharedInterests: ["Coffee", "Photography"],
  },
  {
    id: "cand-2",
    name: "Meera",
    age: 25,
    location: "Mumbai",
    occupation: "Architect",
    bio: "Into indie cinema, coastal road trips, and trying new street food spots after work.",
    interests: ["Road Trips", "Movies", "Street Food", "Yoga", "Reading"],
    sharedInterests: ["Movies", "Road Trips"],
  },
  {
    id: "cand-3",
    name: "Kabir",
    age: 28,
    location: "Delhi",
    occupation: "Data Analyst",
    bio: "Early morning runner, cricket fan, and always up for trivia nights.",
    interests: ["Fitness", "Cricket", "Web Series", "Cycling", "Baking"],
    sharedInterests: ["Fitness"],
  },
  {
    id: "cand-4",
    name: "Ananya",
    age: 24,
    location: "Pune",
    occupation: "Editorial Illustrator",
    bio: "Sketchbook in my tote, lo-fi playlists on loop, and planning my next beach trip.",
    interests: ["Pop Music", "Beaches", "Dancing", "Coffee", "Exploring New Places"],
    sharedInterests: ["Coffee", "Beaches"],
  },
];

// Deterministic subset of mock candidates that simulate a mutual match on Like
const MUTUAL_MATCH_IDS = new Set(["cand-2", "cand-4"]);

const swipedIds = new Set<string>();

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
 * Isolated mock match service for local frontend testing when the backend
 * match API is unavailable.
 */
export const mockMatchService: MatchService = {
  mode: "mock",

  async getDeck(signal?: AbortSignal): Promise<MatchDeckResponse> {
    await delay(260, signal);
    const remaining = MOCK_CANDIDATES.filter((c) => !swipedIds.has(c.id));

    // Allow deck refresh to cycle back if all mock profiles were swiped
    if (remaining.length === 0) {
      swipedIds.clear();
      return {
        candidates: [...MOCK_CANDIDATES],
        isMockResponse: true,
      };
    }

    return {
      candidates: remaining,
      isMockResponse: true,
    };
  },

  async swipe(payload: SwipeRequest): Promise<SwipeResponse> {
    await delay(220);
    swipedIds.add(payload.candidateId);

    const candidate = MOCK_CANDIDATES.find((c) => c.id === payload.candidateId);

    if (
      payload.action === "LIKE" &&
      candidate &&
      MUTUAL_MATCH_IDS.has(candidate.id)
    ) {
      const conversation = addMockConversationFromMatch({
        participantId: candidate.id,
        name: candidate.name,
        age: candidate.age,
        location: candidate.location,
        interests: candidate.interests,
      });

      return {
        matched: true,
        conversationId: conversation.id,
        matchedUser: {
          id: candidate.id,
          name: candidate.name,
          photoUrl: candidate.photoUrl,
        },
        message: `You and ${candidate.name} liked each other! (Simulated mock match)`,
        isMockResponse: true,
      };
    }

    return {
      matched: false,
      isMockResponse: true,
    };
  },
};
