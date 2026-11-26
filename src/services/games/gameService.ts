import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { mockGameService } from "./mockGameService";
import { realGameService } from "./realGameService";
import type { GameService } from "./types";

export const gameService: GameService =
  AUTH_CONFIG.mode === "api" ? realGameService : mockGameService;

export * from "./types";
export { GAME_ENDPOINTS } from "./endpoints";
