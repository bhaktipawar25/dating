import type { AuthMode } from "./types";

const rawMode = process.env.NEXT_PUBLIC_AUTH_MODE?.trim().toLowerCase();

export const AUTH_CONFIG: {
  mode: AuthMode;
  apiBaseUrl: string;
} = {
  mode: rawMode === "api" ? "api" : "mock",
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, ""),
};

/**
 * Core authentication endpoints specified by the backend contract, plus
 * configurable paths for endpoints to be finalized by the backend team.
 */
export const AUTH_ENDPOINTS = {
  checkUsername: "/v1/auth/check-username",
  login: "/v1/auth/login",
  sendOtp: "/v1/auth/send-otp",
  verifyOtp: "/v1/auth/verify-otp",
  register: process.env.NEXT_PUBLIC_AUTH_REGISTER_ENDPOINT?.trim() ?? "",
  forgotPassword:
    process.env.NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENDPOINT?.trim() ?? "",
  resetPassword:
    process.env.NEXT_PUBLIC_AUTH_RESET_PASSWORD_ENDPOINT?.trim() ?? "",
  refreshSession: process.env.NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT?.trim() ?? "",
  logout: process.env.NEXT_PUBLIC_AUTH_LOGOUT_ENDPOINT?.trim() ?? "",
  me: process.env.NEXT_PUBLIC_AUTH_ME_ENDPOINT?.trim() ?? "",
} as const;
