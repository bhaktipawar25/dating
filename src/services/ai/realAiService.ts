import { authHttpRequest } from "@/services/auth/httpClient";
import { AuthServiceError } from "@/services/auth/types";
import { AI_ENDPOINTS } from "./endpoints";
import {
  AiServiceError,
  type AiChatSuggestRequest,
  type AiChatSuggestResponse,
  type AiService,
  type DatePlannerRequest,
  type DatePlannerResponse,
} from "./types";

function mapAiError(err: unknown, fallback: string): AiServiceError {
  if (err instanceof AuthServiceError) {
    return new AiServiceError(err.message, {
      status: err.status,
      code: err.code,
    });
  }
  return new AiServiceError(fallback, {
    status: 0,
    code: "AI_REQUEST_ERROR",
  });
}

export const realAiService: AiService = {
  mode: "api",

  async suggestChat(
    payload: AiChatSuggestRequest,
    signal?: AbortSignal
  ): Promise<AiChatSuggestResponse> {
    try {
      return await authHttpRequest<AiChatSuggestResponse>(
        AI_ENDPOINTS.chatSuggest,
        {
          method: "POST",
          body: payload,
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      throw mapAiError(
        err,
        "Unable to generate AI suggestions right now. Please try again."
      );
    }
  },

  async generateDatePlan(
    payload: DatePlannerRequest,
    signal?: AbortSignal
  ): Promise<DatePlannerResponse> {
    try {
      return await authHttpRequest<DatePlannerResponse>(
        AI_ENDPOINTS.datePlanner,
        {
          method: "POST",
          body: payload,
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      throw mapAiError(
        err,
        "Unable to generate a date plan right now. Your details are preserved."
      );
    }
  },
};
