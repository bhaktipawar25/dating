import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { mockAiService } from "./mockAiService";
import { realAiService } from "./realAiService";
import type { AiService } from "./types";

export const aiService: AiService =
  AUTH_CONFIG.mode === "api" ? realAiService : mockAiService;

export * from "./types";
export { AI_ENDPOINTS } from "./endpoints";
