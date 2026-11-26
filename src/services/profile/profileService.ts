import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { mockProfileService } from "./mockProfileService";
import { realProfileService } from "./realProfileService";
import type { ProfileService } from "./types";

export const profileService: ProfileService =
  AUTH_CONFIG.mode === "api" ? realProfileService : mockProfileService;

export * from "./types";
export { PROFILE_ENDPOINTS } from "./endpoints";
