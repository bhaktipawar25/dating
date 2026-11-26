import type { AuthMode } from "@/services/auth/types";
import type {
  DiscoveryPreferenceId,
  ProfileVisibilitySettings,
  SexOptionId,
} from "@/lib/profile/personalInfoConfig";

export interface InterestTag {
  id: string;
  label: string;
  categoryId: string;
}

export interface InterestCategory {
  id: string;
  name: string;
  tags: InterestTag[];
}

export interface GetInterestsResponse {
  categories: InterestCategory[];
  isMockResponse?: boolean;
}

export interface PersonalInfoPayload {
  sex: SexOptionId;
  interestedIn: DiscoveryPreferenceId[];
  interests: string[];
  visibility: ProfileVisibilitySettings;
  completeOnboarding?: boolean;
}

export interface PersonalInfoResponse {
  message: string;
  profileCompleted: boolean;
  personalInfo: PersonalInfoPayload;
  updatedAt?: string;
  isMockResponse?: boolean;
}

export class ProfileServiceError extends Error {
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
    this.name = "ProfileServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "PROFILE_ERROR";
  }
}

export interface ProfileService {
  readonly mode: AuthMode;
  getInterests(signal?: AbortSignal): Promise<GetInterestsResponse>;
  savePersonalInfo(
    payload: PersonalInfoPayload
  ): Promise<PersonalInfoResponse>;
  getPersonalInfo(signal?: AbortSignal): Promise<PersonalInfoResponse | null>;
}
