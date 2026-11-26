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
}

const RESERVED_USERNAMES = new Set([
  "admin",
  "alex",
  "sarah_m",
  "testuser",
  "date2_official",
]);

const DEFAULT_MOCK_OTP = "123456";
const EXPIRED_TEST_OTP = "000000";

const DEV_SESSION_STORAGE_KEY = "date2_dev_mock_session_user";

const globalForMockAuth = globalThis as typeof globalThis & {
  __date2MockUsers?: MockUserRecord[];
  __date2ActiveSessionUser?: AuthUser | null;
};

const mockUsers: MockUserRecord[] =
  globalForMockAuth.__date2MockUsers ?? (globalForMockAuth.__date2MockUsers = []);

function isDevMockMode(): boolean {
  return process.env.NODE_ENV !== "production" && AUTH_CONFIG.mode === "mock";
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

const mockOtpStore = new Map<string, MockOtpRecord>();
const mockResetTokens = new Map<string, string>();

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
 * Clearly isolated in-memory mock service for frontend UI verification when
 * no backend server is running. Does NOT issue real sessions or send emails.
 */
export const mockAuthService: AuthService = {
  mode: "mock",

  async checkUsername(
    username: string,
    signal?: AbortSignal
  ): Promise<CheckUsernameResponse> {
    await delay(260, signal);
    const normalized = username.trim().toLowerCase();
    const isTaken =
      RESERVED_USERNAMES.has(normalized) ||
      mockUsers.some((u) => u.username.toLowerCase() === normalized);

    return {
      username: username.trim(),
      available: !isTaken,
      message: isTaken
        ? "This username is already taken."
        : "Username is available.",
    };
  },

  async login(payload: LoginRequest): Promise<LoginResponse> {
    await delay(450);
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

    if (!user.emailVerified) {
      throw new AuthServiceError(
        "Your email address is not verified yet. Please enter your verification code first.",
        { status: 403, code: "EMAIL_NOT_VERIFIED" }
      );
    }

    setActiveSessionUser(user);

    return {
      message: "Signed in using mock frontend test mode.",
      user: toPublicUser(user),
    };
  },

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    await delay(500);
    const normalizedUsername = payload.username.trim().toLowerCase();
    const normalizedEmail = payload.email.trim().toLowerCase();

    if (
      RESERVED_USERNAMES.has(normalizedUsername) ||
      mockUsers.some((u) => u.username.toLowerCase() === normalizedUsername)
    ) {
      throw new AuthServiceError("That username is already taken.", {
        status: 409,
        code: "USERNAME_TAKEN",
        fieldErrors: { username: "That username is already taken." },
      });
    }

    if (mockUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new AuthServiceError(
        "An account with this email already exists.",
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
      username: payload.username.trim(),
      email: normalizedEmail,
      password: payload.password,
      emailVerified: false,
    };
    mockUsers.push(createdUser);
    setActiveSessionUser(createdUser);

    mockOtpStore.set(normalizedEmail, {
      code: DEFAULT_MOCK_OTP,
      expiresAt: Date.now() + 120_000,
    });

    return {
      message: "Mock account created. Simulated verification code issued.",
      email: normalizedEmail,
      otpSent: true,
      expiresInSeconds: 120,
      mockOtpHint: DEFAULT_MOCK_OTP,
    };
  },

  async sendOtp(payload: SendOtpRequest): Promise<SendOtpResponse> {
    await delay(380);
    const normalizedEmail = payload.email.trim().toLowerCase();

    mockOtpStore.set(normalizedEmail, {
      code: DEFAULT_MOCK_OTP,
      expiresAt: Date.now() + 120_000,
    });

    return {
      message: `Simulated OTP issued for ${normalizedEmail}.`,
      email: normalizedEmail,
      expiresInSeconds: 120,
      cooldownSeconds: 60,
      mockOtpHint: DEFAULT_MOCK_OTP,
    };
  },

  async verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    await delay(420);
    const normalizedEmail = payload.email.trim().toLowerCase();
    const code = payload.otp.trim();

    if (code === EXPIRED_TEST_OTP) {
      throw new AuthServiceError(
        "This verification code has expired. Please request a new code.",
        { status: 410, code: "OTP_EXPIRED" }
      );
    }

    const record = mockOtpStore.get(normalizedEmail);
    const expectedCode = record?.code ?? DEFAULT_MOCK_OTP;

    if (record && Date.now() > record.expiresAt) {
      throw new AuthServiceError(
        "This verification code has expired. Please resend a new code.",
        { status: 410, code: "OTP_EXPIRED" }
      );
    }

    if (code !== expectedCode) {
      throw new AuthServiceError(
        `Incorrect verification code. (In mock mode, use ${expectedCode}, or ${EXPIRED_TEST_OTP} to test expiry.)`,
        { status: 400, code: "OTP_INVALID" }
      );
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
    mockOtpStore.delete(normalizedEmail);

    return {
      message: "Email verified successfully in mock test mode.",
      verified: true,
      email: normalizedEmail,
    };
  },

  async forgotPassword(
    payload: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    await delay(420);
    const normalizedEmail = payload.email.trim().toLowerCase();
    const token = "mock-reset-token";
    mockResetTokens.set(token, normalizedEmail);

    return {
      message:
        "Simulated password reset instructions prepared. Use the reset link below to test the new password stage.",
      email: normalizedEmail,
      mockResetToken: token,
    };
  },

  async resetPassword(
    payload: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    await delay(420);
    const targetEmail = mockResetTokens.get(payload.token.trim());
    if (!payload.token.trim() || (!targetEmail && payload.token !== "mock-reset-token")) {
      throw new AuthServiceError(
        "Reset token is invalid or expired. Request a new password reset link.",
        { status: 400, code: "INVALID_RESET_TOKEN" }
      );
    }

    if (targetEmail) {
      const user = mockUsers.find(
        (u) => u.email.toLowerCase() === targetEmail
      );
      if (user) {
        user.password = payload.newPassword;
      }
      mockResetTokens.delete(payload.token.trim());
    }

    return {
      message: "Password updated in mock test mode. You can now sign in.",
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
};
