import type { AuthMode } from "@/services/auth/types";

export interface CandidateProfile {
  id: string;
  name: string;
  age?: number;
  location?: string;
  bio?: string;
  photoUrl?: string;
  interests: string[];
  sharedInterests?: string[];
  occupation?: string;
}

export interface MatchDeckResponse {
  candidates: CandidateProfile[];
  isMockResponse?: boolean;
}

export type SwipeAction = "LIKE" | "DISLIKE";

export interface SwipeRequest {
  candidateId: string;
  action: SwipeAction;
}

export interface MatchedUserSummary {
  id: string;
  name: string;
  photoUrl?: string;
}

export interface SwipeResponse {
  matched: boolean;
  conversationId?: string;
  matchedUser?: MatchedUserSummary;
  currentUserPhotoUrl?: string;
  message?: string;
  isMockResponse?: boolean;
}

export class MatchServiceError extends Error {
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
    this.name = "MatchServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "MATCH_ERROR";
  }
}

export interface MatchService {
  readonly mode: AuthMode;
  getDeck(signal?: AbortSignal): Promise<MatchDeckResponse>;
  swipe(payload: SwipeRequest): Promise<SwipeResponse>;
}
