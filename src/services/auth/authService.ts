import { AUTH_CONFIG } from "./endpoints";
import { mockAuthService } from "./mockAuthService";
import { realAuthService } from "./realAuthService";
import type { AuthService } from "./types";

export const authService: AuthService =
  AUTH_CONFIG.mode === "api" ? realAuthService : mockAuthService;

export * from "./types";
export { AUTH_CONFIG, AUTH_ENDPOINTS } from "./endpoints";
