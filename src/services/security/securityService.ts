import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { mockSecurityService } from "./mockSecurityService";
import { realSecurityService } from "./realSecurityService";
import type { SecurityService } from "./types";

export const securityService: SecurityService =
  AUTH_CONFIG.mode === "api" ? realSecurityService : mockSecurityService;

export * from "./types";
export { SECURITY_ENDPOINTS } from "./endpoints";
