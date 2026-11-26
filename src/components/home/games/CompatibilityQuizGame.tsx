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
      <p className="text-sm text-brand-muted">
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
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-forest">
          Prompt {session.progress.current} of {session.progress.total}
        </p>
        <h3 className="mt-1.5 text-lg font-bold text-brand-ink">
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
              className={`rounded-2xl border p-4 text-left text-sm font-semibold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/30 disabled:cursor-not-allowed ${
                isSelected
                  ? "border-brand-forest bg-brand-forest text-white shadow-soft"
                  : "border-brand-border bg-white text-brand-ink hover:border-brand-mint hover:bg-brand-canvas"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {session.waitingForPartner ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-brand-canvas px-4 py-3 text-xs font-medium text-brand-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-mint border-t-brand-forest" />
          <span>
            Syncing answers with {session.partnerName}...
          </span>
        </div>
      ) : (
        <button
          type="button"
          disabled={!selectedOptionId || alreadySubmitted}
          onClick={handleSubmit}
          className="w-full rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover disabled:cursor-not-allowed disabled:opacity-55"
        >
          Confirm Choice
        </button>
      )}
    </div>
  );
}
