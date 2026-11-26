import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { mockChatService } from "./mockChatService";
import { realChatService } from "./realChatService";
import type { ChatService } from "./types";

export const chatService: ChatService =
  AUTH_CONFIG.mode === "api" ? realChatService : mockChatService;

export * from "./types";
export { CHAT_ENDPOINTS } from "./endpoints";
