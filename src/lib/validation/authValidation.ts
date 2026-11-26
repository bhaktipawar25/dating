export const USERNAME_REGEX = /^[a-z0-9_]+$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const OTP_REGEX = /^\d{6}$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: "" | "Weak" | "Moderate" | "Strong";
  criteria: PasswordCriteria;
  satisfiedCount: number;
  totalCount: number;
}

/** Matches Flutter's UsernameValidationConfig.normalize(raw). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Matches Flutter's UsernameValidationConfig.validate(raw). */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return "Username is required";
  }
  const normalized = normalizeUsername(trimmed);
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return `Username cannot exceed ${USERNAME_MAX_LENGTH} characters`;
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return "Only lowercase letters, numbers, and underscores (_) allowed";
  }
  return null;
}

export function validateEmail(email: string, emptyMessage = "Email is required"): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return emptyMessage;
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Enter a valid email address";
  }
  return null;
}

/** Matches Flutter's LoginScreen identifier validator. */
export function validateLoginIdentifier(identifier: string): string | null {
  if (!identifier.trim()) {
    return "Please enter your username or email";
  }
  return null;
}

export function evaluatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const criteria: PasswordCriteria = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>\-_+=~`[\]\\/;]/.test(password),
  };

  let satisfiedCount = 0;
  if (criteria.minLength) satisfiedCount += 1;
  if (criteria.hasUppercase) satisfiedCount += 1;
  if (criteria.hasNumber) satisfiedCount += 1;
  if (criteria.hasSpecial) satisfiedCount += 1;

  const totalCount = 4;
  const ratio = satisfiedCount / totalCount;
  const label: PasswordStrengthResult["label"] =
    satisfiedCount === 0
      ? ""
      : ratio <= 0.5
        ? "Weak"
        : ratio < 1.0
          ? "Moderate"
          : "Strong";

  return {
    score: satisfiedCount as 0 | 1 | 2 | 3 | 4,
    label,
    criteria,
    satisfiedCount,
    totalCount,
  };
}

/** Matches Flutter's LoginScreen password validator. */
export function validateLoginPassword(password: string): string | null {
  if (!password) {
    return "Please enter your password";
  }
  return null;
}

/** Matches Flutter's SignUpScreen & PasswordResetScreen strong password policy. */
export function validateStrongPassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  const { criteria } = evaluatePasswordStrength(password);
  if (!criteria.minLength) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!criteria.hasUppercase) {
    return "Include at least one uppercase letter (A-Z)";
  }
  if (!criteria.hasNumber) {
    return "Include at least one number (0-9)";
  }
  if (!criteria.hasSpecial) {
    return "Include at least one special character";
  }
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return "Please confirm your password";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match";
  }
  return null;
}

export function validateOtpCode(otp: string): string | null {
  if (!otp) {
    return "Please enter the 6-digit verification code";
  }
  if (!OTP_REGEX.test(otp)) {
    return "Enter the complete 6-digit code";
  }
  return null;
}
