"use client";

import React from "react";
import {
  PASSWORD_MIN_LENGTH,
  evaluatePasswordStrength,
} from "@/lib/validation/authValidation";

interface PasswordStrengthMeterProps {
  password: string;
}

const SCORE_BAR_COLORS: Record<number, string> = {
  0: "bg-date2-border",
  1: "bg-rose-500",
  2: "bg-amber-500",
  3: "bg-date2-indigo",
  4: "bg-date2-deepIndigo",
};

const SCORE_TEXT_COLORS: Record<number, string> = {
  0: "text-date2-muted",
  1: "text-rose-600",
  2: "text-amber-700",
  3: "text-date2-indigo",
  4: "text-date2-midnight",
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { score, label, criteria } = evaluatePasswordStrength(password);

  if (!password) {
    return null;
  }

  const rules = [
    {
      key: "len",
      met: criteria.minLength,
      text: `Minimum ${PASSWORD_MIN_LENGTH} characters`,
    },
    {
      key: "upper",
      met: criteria.hasUppercase,
      text: "At least one uppercase letter (A-Z)",
    },
    {
      key: "num",
      met: criteria.hasNumber,
      text: "At least one number (0-9)",
    },
    {
      key: "sym",
      met: criteria.hasSpecial,
      text: "At least one special character (!@#$...)",
    },
  ];

  return (
    <div
      className="mt-2.5 rounded-[14px] border border-date2-border bg-date2-surface p-3.5 font-helvetica"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-date2-charcoal">Password Strength</span>
        <span className={`font-bold ${SCORE_TEXT_COLORS[score]}`}>{label}</span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5" role="presentation">
        {[1, 2, 3, 4].map((segment) => {
          const active = score >= segment;
          return (
            <div
              key={segment}
              className={`h-1.5 rounded-full transition-colors duration-200 ${
                active ? SCORE_BAR_COLORS[score] : "bg-date2-white"
              }`}
            />
          );
        })}
      </div>

      <ul className="mt-3 space-y-1.5 text-xs">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={`flex items-center gap-2 ${
              rule.met
                ? "font-bold text-date2-deepIndigo"
                : "text-date2-slate"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                rule.met
                  ? "bg-date2-violet text-date2-white"
                  : "border border-date2-softBorder bg-date2-white text-transparent"
              }`}
            >
              ✓
            </span>
            <span>{rule.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
