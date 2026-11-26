import { AUTH_ENDPOINTS } from "./endpoints";
import { authHttpRequest } from "./httpClient";
import {
  AuthServiceError,
  type AuthService,
  type CheckUsernameResponse,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type SendOtpRequest,
  type SendOtpResponse,
  type SessionResponse,
  type VerifyOtpRequest,
  type VerifyOtpResponse,
} from "./types";

function requireConfigurableEndpoint(
  endpoint: string,
  envVarName: string,
  featureLabel: string
): string {
  if (!endpoint) {
    throw new AuthServiceError(
      `${featureLabel} endpoint is not configured yet. Ask the backend team to set ${envVarName}.`,
      { status: 501, code: "ENDPOINT_NOT_CONFIGURED" }
    );
  }
  return endpoint;
}

export const realAuthService: AuthService = {
  mode: "api",

  async checkUsername(
    username: string,
    signal?: AbortSignal
  ): Promise<CheckUsernameResponse> {
    const query = new URLSearchParams({ username: username.trim() }).toString();
    return authHttpRequest<CheckUsernameResponse>(
      `${AUTH_ENDPOINTS.checkUsername}?${query}`,
      {
        method: "GET",
        signal,
        skipAuthRefresh: true,
      }
    );
  },

  async login(payload: LoginRequest): Promise<LoginResponse> {
    return authHttpRequest<LoginResponse>(AUTH_ENDPOINTS.login, {
      method: "POST",
      body: {
        identifier: payload.identifier.trim(),
        password: payload.password,
      },
      skipAuthRefresh: true,
    });
  },

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const endpoint = requireConfigurableEndpoint(
      AUTH_ENDPOINTS.register,
      "NEXT_PUBLIC_AUTH_REGISTER_ENDPOINT",
      "Registration"
    );

    return authHttpRequest<RegisterResponse>(endpoint, {
      method: "POST",
      body: {
        username: payload.username.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      },
      skipAuthRefresh: true,
    });
  },

  async sendOtp(payload: SendOtpRequest): Promise<SendOtpResponse> {
    return authHttpRequest<SendOtpResponse>(AUTH_ENDPOINTS.sendOtp, {
      method: "POST",
      body: {
        email: payload.email.trim().toLowerCase(),
        purpose: payload.purpose ?? "verify-email",
      },
      skipAuthRefresh: true,
    });
  },

  async verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    return authHttpRequest<VerifyOtpResponse>(AUTH_ENDPOINTS.verifyOtp, {
      method: "POST",
      body: {
        email: payload.email.trim().toLowerCase(),
        otp: payload.otp.trim(),
      },
      skipAuthRefresh: true,
    });
  },

  async forgotPassword(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    const endpoint = requireConfigurableEndpoint(
      AUTH_ENDPOINTS.forgotPassword,
      "NEXT_PUBLIC_AUTH_FORGOT_PASSWORD_ENDPOINT",
      "Password reset request"
    );

    return authHttpRequest<ForgotPasswordResponse>(endpoint, {
      method: "POST",
      body: {
        email: payload.email.trim().toLowerCase(),
      },
      skipAuthRefresh: true,
    });
  },

  async resetPassword(
    payload: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    const endpoint = requireConfigurableEndpoint(
      AUTH_ENDPOINTS.resetPassword,
      "NEXT_PUBLIC_AUTH_RESET_PASSWORD_ENDPOINT",
      "Password reset"
    );

    return authHttpRequest<ResetPasswordResponse>(endpoint, {
      method: "POST",
      body: {
        token: payload.token.trim(),
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword,
      },
      skipAuthRefresh: true,
    });
  },

  async getSession(signal?: AbortSignal): Promise<SessionResponse> {
    if (!AUTH_ENDPOINTS.me) {
      return {
        authenticated: true,
        sessionCheckDeferred: true,
      };
    }

    try {
      return await authHttpRequest<SessionResponse>(AUTH_ENDPOINTS.me, {
        method: "GET",
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      if (err instanceof AuthServiceError && err.status === 401) {
        return { authenticated: false };
      }
      throw err;
    }
  },
};
