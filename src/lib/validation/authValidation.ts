export const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const OTP_REGEX = /^\d{6}$/;

export interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Empty" | "Weak" | "Fair" | "Good" | "Strong";
  criteria: PasswordCriteria;
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return "Username is required.";
  }
  if (trimmed.length < 3 || trimmed.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return "Start with a letter and use only letters, numbers, or underscores.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Email address is required.";
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Enter a valid email address (for example, name@example.com).";
  }
  return null;
}

export function validateLoginIdentifier(identifier: string): string | null {
  const trimmed = identifier.trim();
  if (!trimmed) {
    return "Username or email is required.";
  }
  if (trimmed.includes("@")) {
    return EMAIL_REGEX.test(trimmed)
      ? null
      : "Enter a valid email address.";
  }
  if (/\s/.test(trimmed)) {
    return "Username cannot contain spaces.";
  }
  if (trimmed.length < 3) {
    return "Username must be at least 3 characters.";
  }
  return null;
}

export function evaluatePasswordStrength(
  password: string
): PasswordStrengthResult {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return { score: 0, label: "Empty", criteria };
  }

  let score = 0;
  if (criteria.minLength) score += 1;
  if (criteria.hasUppercase && criteria.hasLowercase) score += 1;
  if (criteria.hasNumber) score += 1;
  if (criteria.hasSpecial) score += 1;

  // Keep short passwords capped at Weak even if they mix character classes
  if (password.length < 6) {
    score = 1;
  }

  const clampedScore = Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
  const labels: Record<1 | 2 | 3 | 4, PasswordStrengthResult["label"]> = {
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  return {
    score: clampedScore,
    label: labels[clampedScore],
    criteria,
  };
}

export function validateLoginPassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  return null;
}

export function validateStrongPassword(password: string): string | null {
  if (!password) {
    return "Password is required.";
  }
  const { criteria } = evaluatePasswordStrength(password);
  if (!criteria.minLength) {
    return "Password must be at least 8 characters long.";
  }
  if (!criteria.hasUppercase || !criteria.hasLowercase) {
    return "Include both uppercase and lowercase letters.";
  }
  if (!criteria.hasNumber) {
    return "Include at least one number.";
  }
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export function validateOtpCode(otp: string): string | null {
  if (!otp) {
    return "Please enter the 6-digit verification code.";
  }
  if (!OTP_REGEX.test(otp)) {
    return "Verification code must be exactly 6 numeric digits.";
  }
  return null;
}
