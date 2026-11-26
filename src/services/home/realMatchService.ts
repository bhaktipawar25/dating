import { authHttpRequest } from "@/services/auth/httpClient";
import { AuthServiceError } from "@/services/auth/types";
import { HOME_MATCH_ENDPOINTS } from "./endpoints";
import {
  MatchServiceError,
  type MatchDeckResponse,
  type MatchService,
  type SwipeRequest,
  type SwipeResponse,
} from "./types";

function mapMatchError(err: unknown, fallback: string): MatchServiceError {
  if (err instanceof AuthServiceError) {
    return new MatchServiceError(err.message, {
      status: err.status,
      code: err.code,
    });
  }
  return new MatchServiceError(fallback, {
    status: 0,
    code: "MATCH_REQUEST_ERROR",
  });
}

export const realMatchService: MatchService = {
  mode: "api",

  async getDeck(signal?: AbortSignal): Promise<MatchDeckResponse> {
    try {
      return await authHttpRequest<MatchDeckResponse>(
        HOME_MATCH_ENDPOINTS.deck,
        {
          method: "GET",
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      throw mapMatchError(
        err,
        "Unable to load potential matches right now."
      );
    }
  },

  async swipe(payload: SwipeRequest): Promise<SwipeResponse> {
    try {
      return await authHttpRequest<SwipeResponse>(HOME_MATCH_ENDPOINTS.swipe, {
        method: "POST",
        body: payload,
      });
    } catch (err) {
      throw mapMatchError(
        err,
        "Unable to record your response. Please try again."
      );
    }
  },
};
