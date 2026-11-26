import type { AuthMode } from "@/services/auth/types";

export type AiSuggestMode = "icebreakers" | "replies";

export interface AiChatSuggestRequest {
  conversationId: string;
  mode: AiSuggestMode;
  matchProfile: {
    id: string;
    name: string;
    age?: number;
    location?: string;
    interests?: string[];
  };
  recentMessages?: Array<{
    sender: "me" | "match";
    content: string;
  }>;
}

export interface AiChatSuggestion {
  id: string;
  category?: string;
  text: string;
}

export interface AiChatSuggestResponse {
  suggestions: AiChatSuggestion[];
  isMockResponse?: boolean;
}

export interface DatePlannerRequest {
  conversationId: string;
  budget: string;
  location: string;
  vibe: string;
  date: string;
  time: string;
  duration?: string;
  matchName?: string;
}

export interface DateItineraryItem {
  id: string;
  activityName: string;
  location: string;
  suggestedTime: string;
  description: string;
  estimatedBudget?: string;
}

export interface DatePlannerResponse {
  planTitle?: string;
  items: DateItineraryItem[];
  isMockResponse?: boolean;
}

export class AiServiceError extends Error {
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
    this.name = "AiServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "AI_ERROR";
  }
}

export interface AiService {
  readonly mode: AuthMode;
  suggestChat(
    payload: AiChatSuggestRequest,
    signal?: AbortSignal
  ): Promise<AiChatSuggestResponse>;
  generateDatePlan(
    payload: DatePlannerRequest,
    signal?: AbortSignal
  ): Promise<DatePlannerResponse>;
}
