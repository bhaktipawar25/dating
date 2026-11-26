"use client";

import React, { useEffect, useState } from "react";
import type { GameSessionState } from "@/services/games/types";

interface TriviaGameProps {
  session: GameSessionState;
  onSubmitAnswer: (questionId: string, optionId: string) => void;
}

export function TriviaGame({ session, onSubmitAnswer }: TriviaGameProps) {
  const question = session.trivia?.question;
  const feedback = session.trivia?.feedback;
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
        Waiting for the next trivia question...
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
          Question {session.progress.current} of {session.progress.total}
        </p>
        <h3 className="mt-1.5 text-lg font-bold text-date2-ink">
          {question.prompt}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((option) => {
          const isSelected =
            (session.trivia?.selectedOptionId ?? selectedOptionId) === option.id;
          const isCorrectChoice =
            feedback?.correctOptionId &&
            feedback.correctOptionId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={alreadySubmitted}
              onClick={() => setSelectedOptionId(option.id)}
              className={`rounded-[16px] border p-4 text-left text-sm font-bold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender disabled:cursor-not-allowed ${
                isCorrectChoice
                  ? "border-date2-indigo bg-date2-lavenderMist text-date2-midnight"
                  : isSelected
                    ? "border-date2-midnight bg-date2-midnight text-date2-white shadow-indigoSoft"
                    : "border-date2-border bg-date2-white text-date2-ink hover:border-date2-violet hover:bg-date2-canvas"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-[14px] border px-4 py-3 text-sm font-bold ${
            feedback.isCorrect
              ? "border-date2-paleLavender bg-date2-lavenderMist text-date2-midnight"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {session.waitingForPartner ? (
        <div className="flex items-center gap-2 rounded-[14px] border border-date2-border bg-date2-canvas px-4 py-3 text-xs font-bold text-date2-slate">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-date2-paleLavender border-t-date2-midnight" />
          <span>Waiting for {session.partnerName} to finish this round...</span>
        </div>
      ) : (
        <button
          type="button"
          disabled={!selectedOptionId || alreadySubmitted}
          onClick={handleSubmit}
          className="h-[48px] w-full rounded-[14px] bg-date2-midnight px-4 text-sm font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo disabled:cursor-not-allowed disabled:opacity-55"
        >
          Submit Answer
        </button>
      )}
    </div>
  );
}
