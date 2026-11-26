import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { mockMatchService } from "./mockMatchService";
import { realMatchService } from "./realMatchService";
import type { MatchService } from "./types";

export const matchService: MatchService =
  AUTH_CONFIG.mode === "api" ? realMatchService : mockMatchService;

export * from "./types";
export { HOME_MATCH_ENDPOINTS } from "./endpoints";
