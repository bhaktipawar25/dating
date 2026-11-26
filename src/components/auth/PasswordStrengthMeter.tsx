"use client";

import React from "react";
import { evaluatePasswordStrength } from "@/lib/validation/authValidation";

interface PasswordStrengthMeterProps {
  password: string;
}

const SCORE_BAR_COLORS: Record<number, string> = {
  0: "bg-brand-border/60",
  1: "bg-rose-500",
  2: "bg-amber-500",
  3: "bg-brand-mint",
  4: "bg-brand-forest",
};

const SCORE_TEXT_COLORS: Record<number, string> = {
  0: "text-brand-muted",
  1: "text-rose-600",
  2: "text-amber-700",
  3: "text-teal-700",
  4: "text-brand-forest",
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { score, label, criteria } = evaluatePasswordStrength(password);

  if (!password) {
    return null;
  }

  const rules = [
    { key: "len", met: criteria.minLength, text: "8+ characters" },
    {
      key: "case",
      met: criteria.hasUppercase && criteria.hasLowercase,
      text: "Upper & lowercase",
    },
    { key: "num", met: criteria.hasNumber, text: "One number" },
    { key: "sym", met: criteria.hasSpecial, text: "Special character" },
  ];

  return (
    <div
      className="mt-2 rounded-xl border border-brand-border/80 bg-brand-ice/60 p-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-brand-muted">Password strength</span>
        <span className={`font-semibold ${SCORE_TEXT_COLORS[score]}`}>
          {label}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5" role="presentation">
        {[1, 2, 3, 4].map((segment) => {
          const active = score >= segment;
          return (
            <div
              key={segment}
              className={`h-1.5 rounded-full transition-colors duration-200 ${
                active ? SCORE_BAR_COLORS[score] : "bg-white"
              }`}
            />
          );
        })}
      </div>

      <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={`flex items-center gap-1.5 ${
              rule.met ? "font-medium text-brand-forest" : "text-brand-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] ${
                rule.met
                  ? "bg-brand-mint text-brand-forest"
                  : "border border-brand-border bg-white text-transparent"
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
