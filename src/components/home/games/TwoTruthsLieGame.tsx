"use client";

import React, { useEffect, useState } from "react";
import type { GameSessionState } from "@/services/games/types";

interface TwoTruthsLieGameProps {
  session: GameSessionState;
  onSubmitRound: (
    statements: [string, string, string],
    lieIndex: number
  ) => void;
  onSubmitGuess: (guessedIndex: number) => void;
  onNextStep: () => void;
}

export function TwoTruthsLieGame({
  session,
  onSubmitRound,
  onSubmitGuess,
  onNextStep,
}: TwoTruthsLieGameProps) {
  const round = session.twoTruths;
  const [statements, setStatements] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [lieIndex, setLieIndex] = useState<number>(2);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSelectedGuess(null);
    setSubmitted(false);
    setCreateError(null);
  }, [round?.roundNumber, round?.phase]);

  if (!round) {
    return (
      <p className="font-helvetica text-sm text-date2-slate">
        Preparing Two Truths &amp; a Lie...
      </p>
    );
  }

  if (round.phase === "create") {
    const handleCreateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (submitted || !session.isMyTurn) return;

      const trimmed = statements.map((s) => s.trim()) as [
        string,
        string,
        string,
      ];
      if (trimmed.some((s) => !s)) {
        setCreateError("Please enter all three statements.");
        return;
      }
      if (new Set(trimmed.map((s) => s.toLowerCase())).size < 3) {
        setCreateError("Please make all three statements distinct.");
        return;
      }

      setCreateError(null);
      setSubmitted(true);
      onSubmitRound(trimmed, lieIndex);
    };

    return (
      <form onSubmit={handleCreateSubmit} className="space-y-4 font-helvetica">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
            Round {round.roundNumber} · Your Turn
          </p>
          <h3 className="mt-1 text-lg font-bold text-date2-ink">
            Write two truths and one lie
          </h3>
          <p className="mt-1 text-xs text-date2-slate">
            Enter three statements and select which one is the lie for{" "}
            {session.partnerName} to guess.
          </p>
        </div>

        <div className="space-y-3">
          {([0, 1, 2] as const).map((idx) => (
            <div
              key={idx}
              className={`rounded-[16px] border p-3.5 transition-colors ${
                lieIndex === idx
                  ? "border-date2-violet bg-date2-lavenderMist/70"
                  : "border-date2-border bg-date2-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor={`ttal-stmt-${idx}`}
                  className="text-xs font-bold text-date2-ink"
                >
                  Statement {idx + 1}
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-date2-deepIndigo">
                  <input
                    type="radio"
                    name="ttal-lie-index"
                    checked={lieIndex === idx}
                    onChange={() => setLieIndex(idx)}
                    className="accent-date2-midnight"
                  />
                  <span>Mark as Lie</span>
                </label>
              </div>
              <input
                id={`ttal-stmt-${idx}`}
                type="text"
                value={statements[idx]}
                disabled={submitted}
                onChange={(e) => {
                  const next = [...statements] as [string, string, string];
                  next[idx] = e.target.value;
                  setStatements(next);
                  if (createError) setCreateError(null);
                }}
                placeholder={`Enter statement ${idx + 1}...`}
                className="date2-input-base"
              />
            </div>
          ))}
        </div>

        {createError && (
          <p role="alert" className="text-xs font-bold text-rose-600">
            {createError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitted}
          className="h-[48px] w-full rounded-[14px] bg-date2-midnight px-4 text-sm font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo disabled:opacity-55"
        >
          Send Statements
        </button>
      </form>
    );
  }

  if (round.phase === "guess") {
    const partnerStatements = round.statements ?? [];
    const handleGuess = () => {
      if (selectedGuess === null || submitted || !session.isMyTurn) return;
      setSubmitted(true);
      onSubmitGuess(selectedGuess);
    };

    return (
      <div className="space-y-4 font-helvetica">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
            Round {round.roundNumber} · Spot the Lie
          </p>
          <h3 className="mt-1 text-lg font-bold text-date2-ink">
            Which of {round.authorName}&apos;s statements is the lie?
          </h3>
        </div>

        <div className="space-y-2.5">
          {partnerStatements.map((stmt, idx) => {
            const isSelected = selectedGuess === idx;
            return (
              <button
                key={idx}
                type="button"
                disabled={submitted}
                onClick={() => setSelectedGuess(idx)}
                className={`w-full rounded-[16px] border p-4 text-left text-sm font-bold transition-all ${
                  isSelected
                    ? "border-date2-midnight bg-date2-midnight text-date2-white shadow-indigoSoft"
                    : "border-date2-border bg-date2-white text-date2-ink hover:border-date2-violet hover:bg-date2-lavenderMist/50"
                }`}
              >
                <span className="mr-2 font-bold">{idx + 1}.</span>
                <span>{stmt}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={selectedGuess === null || submitted}
          onClick={handleGuess}
          className="h-[48px] w-full rounded-[14px] bg-date2-midnight px-4 text-sm font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo disabled:opacity-55"
        >
          Lock In Guess
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-helvetica">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-date2-deepIndigo">
          Round {round.roundNumber} Summary
        </p>
        <h3 className="mt-1 text-lg font-bold text-date2-ink">
          {session.waitingForPartner
            ? `Waiting for ${session.partnerName} to guess...`
            : round.wasCorrect
              ? "The lie was spotted!"
              : "The lie fooled the guesser!"}
        </h3>
      </div>

      {round.statements && (
        <ul className="space-y-2">
          {round.statements.map((stmt, idx) => {
            const isLie = round.lieIndex === idx;
            const wasGuessed = round.guessedIndex === idx;
            return (
              <li
                key={idx}
                className={`flex items-center justify-between gap-3 rounded-[14px] border px-3.5 py-2.5 text-sm ${
                  isLie
                    ? "border-date2-violet bg-date2-lavenderMist font-bold text-date2-midnight"
                    : "border-date2-border bg-date2-white text-date2-ink"
                }`}
              >
                <span>{stmt}</span>
                <div className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold">
                  {isLie && (
                    <span className="rounded-full bg-date2-midnight px-2.5 py-0.5 text-date2-limeMark">
                      Lie
                    </span>
                  )}
                  {wasGuessed && (
                    <span className="rounded-full border border-date2-border bg-date2-white px-2.5 py-0.5 text-date2-slate">
                      Guessed
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {session.waitingForPartner ? (
        <div className="flex items-center gap-2 rounded-[14px] border border-date2-border bg-date2-canvas px-4 py-3 text-xs font-bold text-date2-slate">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-date2-paleLavender border-t-date2-midnight" />
          <span>Waiting for {session.partnerName}&apos;s guess...</span>
        </div>
      ) : (
        !session.completed && (
          <button
            type="button"
            onClick={onNextStep}
            className="h-[48px] w-full rounded-[14px] bg-date2-midnight px-4 text-sm font-bold text-date2-white shadow-indigoSoft transition-colors hover:bg-date2-deepIndigo"
          >
            Continue to {session.partnerName}&apos;s Turn
          </button>
        )
      )}
    </div>
  );
}
