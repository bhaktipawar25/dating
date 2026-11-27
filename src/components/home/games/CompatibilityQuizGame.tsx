"use client";

import React, { useEffect, useState } from "react";
import type { GameSessionState } from "@/services/games/types";

interface CompatibilityQuizGameProps {
  session: GameSessionState;
  onSubmitAnswer: (questionId: string, optionId: string) => void;
}

export function CompatibilityQuizGame({
  session,
  onSubmitAnswer,
}: CompatibilityQuizGameProps) {
  const question = session.compatibility?.question;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submittedForQuestionId, setSubmittedForQuestionId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setSelectedOptionId(null);
    setSubmittedForQuestionId(null);
  }, [question?.id]);

  if (!question) {
    return (
      <p className="font-helvetica text-sm text-date2-slate">
        Loading compatibility prompt...
      </p>
    );
  }

  const alreadySubmitted =
    submittedForQuestionId === question.id || !session.isMyTurn;

  const handleSubmit = () => {
    if (!selectedOptionId || alreadySubmitted) return;
    setSubmittedForQuestionId(question.id);
    onSubmitAnswer(question.id, selectedOptionId);
  };

  return (
    <div className="space-y-5 font-helvetica">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
          Prompt {session.progress.current} of {session.progress.total}
        </p>
        <h3 className="mt-1.5 text-lg font-bold text-date2-ink">
          {question.prompt}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((option) => {
          const isSelected =
            (session.compatibility?.mySelectedOptionId ?? selectedOptionId) ===
            option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={alreadySubmitted}
              onClick={() => setSelectedOptionId(option.id)}
              className={`min-h-[52px] rounded-[16px] border p-3.5 text-left text-sm font-bold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender disabled:cursor-not-allowed sm:p-4 ${
                isSelected
                  ? "border-date2-midnight bg-date2-midnight text-date2-white shadow-indigoSoft"
                  : "border-date2-border bg-date2-white text-date2-ink hover:border-date2-violet hover:bg-date2-canvas"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="rounded-xl border border-date2-border bg-date2-canvas px-3.5 py-2.5 text-[11px] leading-relaxed text-date2-slate">
        Compatibility results are an interactive Date² icebreaker based on your
        shared answers, not a scientific measurement.
      </p>

      {session.waitingForPartner ? (
        <div className="flex items-center gap-2 rounded-[14px] border border-date2-border bg-date2-canvas px-4 py-3 text-xs font-bold text-date2-slate">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-date2-paleLavender border-t-date2-midnight" />
          <span>Syncing answers with {session.partnerName}...</span>
        </div>
      ) : (
        <button
          type="button"
          disabled={!selectedOptionId || alreadySubmitted}
          onClick={handleSubmit}
          className="min-h-[48px] w-full rounded-[14px] bg-date2-midnight px-4 py-2.5 text-sm font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo disabled:cursor-not-allowed disabled:opacity-55"
        >
          Confirm Choice
        </button>
      )}
    </div>
  );
}
