import { authHttpRequest } from "@/services/auth/httpClient";
import { AuthServiceError } from "@/services/auth/types";
import { PROFILE_ENDPOINTS } from "./endpoints";
import {
  ProfileServiceError,
  type GetInterestsResponse,
  type PersonalInfoPayload,
  type PersonalInfoResponse,
  type ProfileService,
} from "./types";

function mapProfileError(err: unknown, fallback: string): ProfileServiceError {
  if (err instanceof AuthServiceError) {
    return new ProfileServiceError(err.message, {
      status: err.status,
      code: err.code,
    });
  }
  return new ProfileServiceError(fallback, {
    status: 0,
    code: "PROFILE_REQUEST_ERROR",
  });
}

export const realProfileService: ProfileService = {
  mode: "api",

  async getInterests(signal?: AbortSignal): Promise<GetInterestsResponse> {
    try {
      return await authHttpRequest<GetInterestsResponse>(
        PROFILE_ENDPOINTS.interests,
        {
          method: "GET",
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      throw mapProfileError(
        err,
        "Unable to load interest categories right now."
      );
    }
  },

  async savePersonalInfo(
    payload: PersonalInfoPayload
  ): Promise<PersonalInfoResponse> {
    try {
      return await authHttpRequest<PersonalInfoResponse>(
        PROFILE_ENDPOINTS.personalInfo,
        {
          method: "PUT",
          body: payload,
        }
      );
    } catch (err) {
      throw mapProfileError(
        err,
        "Unable to save your personal information. Your selections have been preserved."
      );
    }
  },

  async getPersonalInfo(
    signal?: AbortSignal
  ): Promise<PersonalInfoResponse | null> {
    if (!PROFILE_ENDPOINTS.getPersonalInfo) {
      return null;
    }

    try {
      return await authHttpRequest<PersonalInfoResponse>(
        PROFILE_ENDPOINTS.getPersonalInfo,
        {
          method: "GET",
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      if (err instanceof AuthServiceError && err.status === 404) {
        return null;
      }
      throw mapProfileError(err, "Unable to fetch saved profile information.");
    }
  },
};
