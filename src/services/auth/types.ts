export type AuthMode = "mock" | "api";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
}

export interface CheckUsernameResponse {
  username: string;
  available: boolean;
  message?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
  otpSent: boolean;
  expiresInSeconds?: number;
  /** Only populated in mock testing mode; never returned by real SMTP backends. */
  mockOtpHint?: string;
}

export interface SendOtpRequest {
  email: string;
  purpose?: "verify-email" | "resend" | "password-reset";
}

export interface SendOtpResponse {
  message: string;
  email: string;
  expiresInSeconds: number;
  cooldownSeconds?: number;
  /** Only populated in mock testing mode; never returned by real SMTP backends. */
  mockOtpHint?: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
  purpose?: "verify-email" | "password-reset";
}

export interface VerifyOtpResponse {
  message: string;
  verified: boolean;
  email: string;
  /** Returned when verifying a password-reset OTP before setting a new password. */
  resetToken?: string;
}

export interface UpdateUnverifiedEmailRequest {
  currentEmail: string;
  updatedEmail: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  email: string;
  expiresInSeconds?: number;
  /** Only populated in mock testing mode for local flow verification. */
  mockOtpHint?: string;
  /** Only populated in mock testing mode for local flow verification. */
  mockResetToken?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface SessionResponse {
  authenticated: boolean;
  user?: AuthUser;
  /** True when backend does not expose a dedicated session-check endpoint yet. */
  sessionCheckDeferred?: boolean;
}

export type AuthFieldErrors = Record<string, string>;

export class AuthServiceError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: AuthFieldErrors;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      fieldErrors?: AuthFieldErrors;
    }
  ) {
    super(message);
    this.name = "AuthServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "AUTH_ERROR";
    this.fieldErrors = options?.fieldErrors;
  }
}

export interface AuthService {
  readonly mode: AuthMode;
  checkUsername(
    username: string,
    signal?: AbortSignal
  ): Promise<CheckUsernameResponse>;
  login(payload: LoginRequest): Promise<LoginResponse>;
  register(payload: RegisterRequest): Promise<RegisterResponse>;
  sendOtp(payload: SendOtpRequest): Promise<SendOtpResponse>;
  verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse>;
  updateUnverifiedEmail?(
    payload: UpdateUnverifiedEmailRequest
  ): Promise<SendOtpResponse>;
  getMockOtpSnapshot?(
    email: string,
    purpose?: "verify-email" | "password-reset"
  ): { code: string; expiresAt: number } | null;
  expireMockOtp?(
    email: string,
    purpose?: "verify-email" | "password-reset"
  ): void;
  forgotPassword(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse>;
  resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse>;
  getSession(signal?: AbortSignal): Promise<SessionResponse>;
  logout(): Promise<{ message: string }>;
}
