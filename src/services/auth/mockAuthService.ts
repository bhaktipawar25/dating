import { AUTH_CONFIG } from "./endpoints";
import {
  AuthServiceError,
  type AuthService,
  type AuthUser,
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
  type UpdateUnverifiedEmailRequest,
  type VerifyOtpRequest,
  type VerifyOtpResponse,
} from "./types";

interface MockUserRecord {
  id: string;
  username: string;
  email: string;
  password: string;
  emailVerified: boolean;
}

interface MockOtpRecord {
  code: string;
  expiresAt: number;
  purpose: "verify-email" | "password-reset";
}

const RESERVED_USERNAMES = new Set([
  "admin",
  "waseem",
  "alex",
  "date2",
  "support",
  "moderator",
  "official",
  "ananya",
  "sarah_m",
  "testuser",
  "date2_official",
]);

const DEFAULT_MOCK_OTP = "123456";
const EXPIRED_TEST_OTP = "000000";
const OUTAGE_TEST_OTP = "888888";
const DELIVERY_FAIL_TEST_OTP = "999999";
const OTP_TTL_MS = 120_000;
const RESEND_COOLDOWN_SECONDS = 30;

const DEV_SESSION_STORAGE_KEY = "date2_dev_mock_session_user";

const globalForMockAuth = globalThis as typeof globalThis & {
  __date2MockUsers?: MockUserRecord[];
  __date2ActiveSessionUser?: AuthUser | null;
  __date2MockOtps?: Map<string, MockOtpRecord>;
  __date2MockResetTokens?: Map<string, string>;
};

const mockUsers: MockUserRecord[] =
  globalForMockAuth.__date2MockUsers ??
  (globalForMockAuth.__date2MockUsers = []);

const mockOtpStore: Map<string, MockOtpRecord> =
  globalForMockAuth.__date2MockOtps ??
  (globalForMockAuth.__date2MockOtps = new Map<string, MockOtpRecord>());

const mockResetTokens: Map<string, string> =
  globalForMockAuth.__date2MockResetTokens ??
  (globalForMockAuth.__date2MockResetTokens = new Map<string, string>());

function isDevMockMode(): boolean {
  return process.env.NODE_ENV !== "production" && AUTH_CONFIG.mode === "mock";
}

function otpKey(
  email: string,
  purpose: "verify-email" | "password-reset" = "verify-email"
): string {
  return `${purpose}:${email.trim().toLowerCase()}`;
}

function issueMockOtp(
  email: string,
  purpose: "verify-email" | "password-reset"
): MockOtpRecord {
  const cleanEmail = email.trim().toLowerCase();
  const record: MockOtpRecord = {
    code: DEFAULT_MOCK_OTP,
    expiresAt: Date.now() + OTP_TTL_MS,
    purpose,
  };
  mockOtpStore.set(otpKey(cleanEmail, purpose), record);
  return record;
}

function setActiveSessionUser(user: MockUserRecord | null): void {
  const publicUser = user ? toPublicUser(user) : null;
  globalForMockAuth.__date2ActiveSessionUser = publicUser;

  if (typeof window !== "undefined" && isDevMockMode()) {
    try {
      if (publicUser) {
        // Stores only non-sensitive mock profile metadata (never passwords or tokens)
        window.sessionStorage.setItem(
          DEV_SESSION_STORAGE_KEY,
          JSON.stringify(publicUser)
        );
      } else {
        window.sessionStorage.removeItem(DEV_SESSION_STORAGE_KEY);
      }
    } catch {
      // Ignore storage access errors
    }
  }
}

function getActiveSessionUser(): AuthUser | null {
  if (globalForMockAuth.__date2ActiveSessionUser) {
    return globalForMockAuth.__date2ActiveSessionUser;
  }

  if (typeof window !== "undefined" && isDevMockMode()) {
    try {
      const raw = window.sessionStorage.getItem(DEV_SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed && parsed.email && parsed.username) {
          globalForMockAuth.__date2ActiveSessionUser = parsed;
          return parsed;
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }

  return null;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function toPublicUser(record: MockUserRecord): AuthUser {
  return {
    id: record.id,
    username: record.username,
    email: record.email,
    emailVerified: record.emailVerified,
  };
}

/**
 * Isolated in-memory mock service for frontend UI verification when no backend
 * server is running. Does NOT send real emails or expose production secrets.
 */
export const mockAuthService: AuthService = {
  mode: "mock",

  async checkUsername(
    username: string,
    signal?: AbortSignal
  ): Promise<CheckUsernameResponse> {
    await delay(320, signal);
    const normalized = username.trim().toLowerCase();
    const isTaken =
      RESERVED_USERNAMES.has(normalized) ||
      mockUsers.some((u) => u.username.toLowerCase() === normalized);

    return {
      username: normalized,
      available: !isTaken,
      message: isTaken
        ? "✗ Username already taken. Try another."
        : "✓ Username available",
    };
  },

  async login(payload: LoginRequest): Promise<LoginResponse> {
    await delay(400);
    const identifier = payload.identifier.trim().toLowerCase();

    const user = mockUsers.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        u.username.toLowerCase() === identifier
    );

    if (!user || user.password !== payload.password) {
      throw new AuthServiceError("Invalid username/email or password.", {
        status: 401,
        code: "INVALID_CREDENTIALS",
      });
    }

    setActiveSessionUser(user);

    if (!user.emailVerified) {
      issueMockOtp(user.email, "verify-email");
      throw new AuthServiceError(
        "Email verification required before entering Date².",
        {
          status: 403,
          code: "EMAIL_NOT_VERIFIED",
          fieldErrors: { resolvedEmail: user.email },
        }
      );
    }

    return {
      message: "Signed in using local mock test mode.",
      user: toPublicUser(user),
    };
  },

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    await delay(450);
    const normalizedUsername = payload.username.trim().toLowerCase();
    const normalizedEmail = payload.email.trim().toLowerCase();

    if (
      RESERVED_USERNAMES.has(normalizedUsername) ||
      mockUsers.some((u) => u.username.toLowerCase() === normalizedUsername)
    ) {
      throw new AuthServiceError(
        "An account with that email or username already exists.",
        {
          status: 409,
          code: "USERNAME_TAKEN",
          fieldErrors: {
            username: "✗ Username already taken. Try another.",
          },
        }
      );
    }

    if (mockUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new AuthServiceError(
        "An account with that email or username already exists.",
        {
          status: 409,
          code: "EMAIL_TAKEN",
          fieldErrors: {
            email: "An account with this email already exists.",
          },
        }
      );
    }

    const createdUser: MockUserRecord = {
      id: `mock-user-${mockUsers.length + 1}`,
      username: normalizedUsername,
      email: normalizedEmail,
      password: payload.password,
      emailVerified: false,
    };
    mockUsers.push(createdUser);
    setActiveSessionUser(createdUser);

    issueMockOtp(normalizedEmail, "verify-email");

    return {
      message: "Account created. Demo 6-digit verification code issued.",
      email: normalizedEmail,
      otpSent: true,
      expiresInSeconds: OTP_TTL_MS / 1000,
      mockOtpHint: isDevMockMode() ? DEFAULT_MOCK_OTP : undefined,
    };
  },

  async sendOtp(payload: SendOtpRequest): Promise<SendOtpResponse> {
    await delay(350);
    const normalizedEmail = payload.email.trim().toLowerCase();
    const purpose =
      payload.purpose === "password-reset" ? "password-reset" : "verify-email";

    if (normalizedEmail.startsWith("fail")) {
      throw new AuthServiceError(
        `Delivery failed for ${normalizedEmail}. Verify your address or contact support.`,
        { status: 502, code: "OTP_DELIVERY_FAILED" }
      );
    }
    if (normalizedEmail.startsWith("offline")) {
      throw new AuthServiceError(
        "Verification service temporarily unavailable. Please wait and retry.",
        { status: 503, code: "OTP_SERVICE_UNAVAILABLE" }
      );
    }

    issueMockOtp(normalizedEmail, purpose);

    return {
      message: `A 6-digit verification code has been issued for ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInSeconds: OTP_TTL_MS / 1000,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      mockOtpHint: isDevMockMode() ? DEFAULT_MOCK_OTP : undefined,
    };
  },

  async updateUnverifiedEmail(
    payload: UpdateUnverifiedEmailRequest
  ): Promise<SendOtpResponse> {
    await delay(350);
    const oldEmail = payload.currentEmail.trim().toLowerCase();
    const newEmail = payload.updatedEmail.trim().toLowerCase();

    if (newEmail.startsWith("fail")) {
      throw new AuthServiceError(
        `Delivery failed for ${newEmail}. Verify your address or contact support.`,
        { status: 502, code: "OTP_DELIVERY_FAILED" }
      );
    }

    const user = mockUsers.find((u) => u.email.toLowerCase() === oldEmail);
    if (user) {
      user.email = newEmail;
      user.emailVerified = false;
      setActiveSessionUser(user);
    } else {
      const existing = getActiveSessionUser();
      if (existing) {
        const updatedSession: AuthUser = {
          ...existing,
          email: newEmail,
          emailVerified: false,
        };
        globalForMockAuth.__date2ActiveSessionUser = updatedSession;
      }
    }

    mockOtpStore.delete(otpKey(oldEmail, "verify-email"));
    issueMockOtp(newEmail, "verify-email");

    return {
      message: `Verification code sent to ${newEmail}.`,
      email: newEmail,
      expiresInSeconds: OTP_TTL_MS / 1000,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      mockOtpHint: isDevMockMode() ? DEFAULT_MOCK_OTP : undefined,
    };
  },

  async verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    await delay(420);
    const normalizedEmail = payload.email.trim().toLowerCase();
    const code = payload.otp.trim();
    const purpose =
      payload.purpose === "password-reset" ? "password-reset" : "verify-email";

    if (code === EXPIRED_TEST_OTP) {
      throw new AuthServiceError(
        "This OTP has expired. Tap Resend Code to request a fresh code.",
        { status: 410, code: "OTP_EXPIRED" }
      );
    }
    if (code === OUTAGE_TEST_OTP) {
      throw new AuthServiceError(
        "Verification service temporarily unavailable. Please wait and retry.",
        { status: 503, code: "OTP_SERVICE_UNAVAILABLE" }
      );
    }
    if (code === DELIVERY_FAIL_TEST_OTP) {
      throw new AuthServiceError(
        `Delivery failed for ${normalizedEmail}. Verify your address or contact support.`,
        { status: 502, code: "OTP_DELIVERY_FAILED" }
      );
    }

    const key = otpKey(normalizedEmail, purpose);
    const record = mockOtpStore.get(key);
    const expectedCode = record?.code ?? DEFAULT_MOCK_OTP;

    if (record && Date.now() > record.expiresAt) {
      throw new AuthServiceError(
        "This OTP has expired. Tap Resend Code to request a fresh code.",
        { status: 410, code: "OTP_EXPIRED" }
      );
    }

    if (code !== expectedCode) {
      throw new AuthServiceError(
        "Invalid code entered. Check the 6-digit OTP and try again.",
        { status: 400, code: "OTP_INVALID" }
      );
    }

    mockOtpStore.delete(key);

    if (purpose === "password-reset") {
      const resetToken = `mock-reset-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      mockResetTokens.set(resetToken, normalizedEmail);
      return {
        message: "Reset code verified.",
        verified: true,
        email: normalizedEmail,
        resetToken,
      };
    }

    const user = mockUsers.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (user) {
      user.emailVerified = true;
      setActiveSessionUser(user);
    } else {
      const existing = getActiveSessionUser();
      const updatedSession: AuthUser =
        existing && existing.email.toLowerCase() === normalizedEmail
          ? { ...existing, emailVerified: true }
          : {
              id: `mock-verified-${Date.now()}`,
              username: normalizedEmail.split("@")[0] || "member",
              email: normalizedEmail,
              emailVerified: true,
            };
      globalForMockAuth.__date2ActiveSessionUser = updatedSession;
      if (typeof window !== "undefined" && isDevMockMode()) {
        try {
          window.sessionStorage.setItem(
            DEV_SESSION_STORAGE_KEY,
            JSON.stringify(updatedSession)
          );
        } catch {
          // Ignore storage access errors
        }
      }
    }

    return {
      message: "Email verified successfully in mock test mode.",
      verified: true,
      email: normalizedEmail,
    };
  },

  getMockOtpSnapshot(
    email: string,
    purpose: "verify-email" | "password-reset" = "verify-email"
  ): { code: string; expiresAt: number } | null {
    if (!isDevMockMode()) return null;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;
    const key = otpKey(cleanEmail, purpose);
    const existing = mockOtpStore.get(key);
    if (existing) {
      return { code: existing.code, expiresAt: existing.expiresAt };
    }
    const created = issueMockOtp(cleanEmail, purpose);
    return { code: created.code, expiresAt: created.expiresAt };
  },

  expireMockOtp(
    email: string,
    purpose: "verify-email" | "password-reset" = "verify-email"
  ): void {
    if (!isDevMockMode()) return;
    const key = otpKey(email, purpose);
    const existing = mockOtpStore.get(key);
    if (!existing) return;
    mockOtpStore.set(key, {
      ...existing,
      expiresAt: Date.now() - 1000,
    });
  },

  async forgotPassword(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    await delay(350);
    const normalizedEmail = payload.email.trim().toLowerCase();

    if (
      normalizedEmail.startsWith("fail") ||
      normalizedEmail.startsWith("unknown")
    ) {
      throw new AuthServiceError(
        "Unable to dispatch code. Verify email or try again.",
        { status: 400, code: "RESET_DISPATCH_FAILED" }
      );
    }

    issueMockOtp(normalizedEmail, "password-reset");

    return {
      message: `6-digit verification code sent to ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInSeconds: OTP_TTL_MS / 1000,
      mockOtpHint: isDevMockMode() ? DEFAULT_MOCK_OTP : undefined,
    };
  },

  async resetPassword(
    payload: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    await delay(450);
    const token = payload.token.trim();
    const targetEmail = mockResetTokens.get(token);

    if (!token) {
      throw new AuthServiceError(
        "Reset verification session is missing or expired. Please request a new code.",
        { status: 400, code: "INVALID_RESET_TOKEN" }
      );
    }

    const emailToMatch = targetEmail ?? token;
    const user = mockUsers.find(
      (u) => u.email.toLowerCase() === emailToMatch.toLowerCase()
    );
    if (user) {
      user.password = payload.newPassword;
    }
    if (targetEmail) {
      mockResetTokens.delete(token);
    }

    return {
      message:
        "Your password has been updated. Please sign in with your new credentials.",
    };
  },

  async getSession(signal?: AbortSignal): Promise<SessionResponse> {
    await delay(100, signal);
    const current = getActiveSessionUser();
    if (!current) {
      return { authenticated: false };
    }
    return {
      authenticated: true,
      user: current,
    };
  },

  async logout(): Promise<{ message: string }> {
    await delay(180);
    setActiveSessionUser(null);
    return {
      message: "Signed out of local test session.",
    };
  },
};
