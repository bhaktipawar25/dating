"use client";

import React, { useRef } from "react";

interface OtpInputGroupProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  length?: number;
}

export function OtpInputGroup({
  value,
  onChange,
  disabled = false,
  hasError = false,
  length = 6,
}: OtpInputGroupProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = Array.from({ length }, (_, idx) => value[idx] ?? "");

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputRefs.current[clamped]?.focus();
    inputRefs.current[clamped]?.select();
  };

  const commitDigits = (nextDigits: string[]) => {
    const joined = nextDigits.join("").slice(0, length);
    onChange(joined);
  };

  const handleChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, "");
    if (!cleaned) {
      const next = [...digits];
      next[index] = "";
      commitDigits(next);
      return;
    }

    if (cleaned.length > 1) {
      const next = [...digits];
      for (
        let offset = 0;
        offset < cleaned.length && index + offset < length;
        offset += 1
      ) {
        next[index + offset] = cleaned[offset];
      }
      commitDigits(next);
      const targetIndex = Math.min(length - 1, index + cleaned.length);
      focusBox(targetIndex);
      return;
    }

    const next = [...digits];
    next[index] = cleaned;
    commitDigits(next);

    if (index < length - 1) {
      focusBox(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        commitDigits(next);
      } else if (index > 0) {
        next[index - 1] = "";
        commitDigits(next);
        focusBox(index - 1);
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusBox(index - 1);
      return;
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      focusBox(index + 1);
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      focusBox(0);
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      focusBox(length - 1);
    }
  };

  const handlePaste = (
    startIndex: number,
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) {
      return;
    }

    e.preventDefault();
    const next = [...digits];
    const writeFrom = pasted.length >= length ? 0 : startIndex;
    for (
      let offset = 0;
      offset < pasted.length && writeFrom + offset < length;
      offset += 1
    ) {
      next[writeFrom + offset] = pasted[offset];
    }
    commitDigits(next);

    const lastFilled = Math.min(length - 1, writeFrom + pasted.length - 1);
    focusBox(lastFilled);
  };

  return (
    <div
      role="group"
      aria-label="Six-digit verification code"
      className="grid grid-cols-6 gap-2 sm:gap-3"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={hasError}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          onFocus={(e) => e.currentTarget.select()}
          className={`h-12 w-full rounded-[14px] border bg-date2-white text-center font-helvetica text-lg font-bold tracking-wider text-date2-ink transition-all duration-150 focus:outline-none focus:ring-4 sm:h-14 sm:text-xl ${
            hasError
              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/15"
              : digit
                ? "border-date2-violet bg-date2-lavenderMist/60 focus:border-date2-deepIndigo focus:ring-date2-paleLavender"
                : "border-date2-border focus:border-date2-violet focus:ring-date2-paleLavender"
          } disabled:cursor-not-allowed disabled:bg-date2-surface disabled:opacity-75`}
        />
      ))}
    </div>
  );
}
