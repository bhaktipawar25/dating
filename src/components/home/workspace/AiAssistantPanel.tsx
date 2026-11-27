"use client";

import React, { useEffect, useRef, useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import {
  AiServiceError,
  aiService,
  type AiChatSuggestion,
  type AiSuggestMode,
} from "@/services/ai/aiService";
import type { ChatConversation } from "@/services/chat/types";

interface AiAssistantPanelProps {
  conversation: ChatConversation;
  currentUserId: string;
  onInsertSuggestion: (text: string) => void;
  onClose: () => void;
}

export function AiAssistantPanel({
  conversation,
  currentUserId,
  onInsertSuggestion,
  onClose,
}: AiAssistantPanelProps) {
  const [mode, setMode] = useState<AiSuggestMode | null>(null);
  const [suggestions, setSuggestions] = useState<AiChatSuggestion[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear stale suggestions when switching conversations
    abortRef.current?.abort();
    setSuggestions([]);
    setError(null);
    setMode(null);
    setInsertedId(null);
  }, [conversation.id]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const fetchSuggestions = async (nextMode: AiSuggestMode) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMode(nextMode);
    setLoading(true);
    setError(null);
    setInsertedId(null);

    try {
      const recentMessages = (conversation.messages ?? [])
        .filter((m) => !m.isEphemeral && m.type !== "game_result")
        .slice(-6)
        .map((m) => ({
          sender: (m.senderId === currentUserId ? "me" : "match") as
            | "me"
            | "match",
          content: m.content,
        }));

      const response = await aiService.suggestChat(
        {
          conversationId: conversation.id,
          mode: nextMode,
          matchProfile: {
            id: conversation.participant.id,
            name: conversation.participant.name,
            age: conversation.participant.age,
            location: conversation.participant.location,
            interests: conversation.participant.interests,
          },
          recentMessages,
        },
        controller.signal
      );

      if (controller.signal.aborted) return;
      setSuggestions(response.suggestions ?? []);
      setIsMock(Boolean(response.isMockResponse));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof AiServiceError
          ? err.message
          : "Unable to load AI suggestions right now. Please retry."
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  return (
    <aside
      aria-label="AI Assistant"
      className="flex h-full flex-col border-t border-date2-border bg-date2-canvas/85 font-helvetica lg:border-l lg:border-t-0"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-date2-border bg-date2-white px-4 py-3.5">
        <div>
          <h3 className="text-sm font-bold text-date2-ink">AI Assistant</h3>
          <p className="mt-0.5 text-xs text-date2-slate">
            Get personalized icebreakers or reply ideas for{" "}
            {conversation.participant.name}.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close AI Assistant"
          onClick={onClose}
          className="rounded-lg border border-date2-border px-2 py-1 text-xs font-semibold text-date2-slate hover:bg-date2-lavenderMist hover:text-date2-ink"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchSuggestions("icebreakers")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
              mode === "icebreakers"
                ? "bg-date2-midnight text-date2-white shadow-sm"
                : "border border-date2-border bg-date2-white text-date2-midnight hover:bg-date2-lavenderMist"
            }`}
          >
            Generate Icebreakers
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => fetchSuggestions("replies")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
              mode === "replies"
                ? "bg-date2-midnight text-date2-white shadow-sm"
                : "border border-date2-border bg-date2-white text-date2-midnight hover:bg-date2-lavenderMist"
            }`}
          >
            Suggest Replies
          </button>
        </div>

        {isMock && suggestions.length > 0 && (
          <p className="rounded-xl border border-date2-border bg-date2-white px-3 py-2 text-[11px] text-date2-slate">
            Simulated AI suggestions for local UI testing. Review and edit
            before sending manually.
          </p>
        )}

        {error && (
          <StatusBanner
            variant="error"
            message={error}
            action={
              mode ? (
                <button
                  type="button"
                  onClick={() => fetchSuggestions(mode)}
                  className="text-xs font-semibold underline underline-offset-2"
                >
                  Retry
                </button>
              ) : undefined
            }
          />
        )}

        {loading ? (
          <div className="space-y-2.5" aria-live="polite">
            <p className="text-xs font-medium text-date2-slate">
              Generating suggestions...
            </p>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-20 animate-pulse rounded-2xl border border-date2-border bg-date2-white"
              />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-date2-border bg-date2-white/90 p-4 text-center text-xs text-date2-slate">
            Choose <strong>Generate Icebreakers</strong> or{" "}
            <strong>Suggest Replies</strong> above to insert a tailored draft
            into your message box.
          </div>
        ) : (
          <div className="space-y-2.5">
            {suggestions.map((suggestion) => {
              const wasInserted = insertedId === suggestion.id;
              return (
                <div
                  key={suggestion.id}
                  className="space-y-2.5 rounded-2xl border border-date2-border bg-date2-white p-3.5 shadow-sm"
                >
                  {suggestion.category && (
                    <span className="inline-block rounded-full bg-date2-lavenderMist px-2.5 py-0.5 text-[10px] font-bold text-date2-deepIndigo">
                      {suggestion.category}
                    </span>
                  )}
                  <p className="text-xs leading-relaxed text-date2-ink">
                    {suggestion.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onInsertSuggestion(suggestion.text);
                      setInsertedId(suggestion.id);
                    }}
                    className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                      wasInserted
                        ? "border border-date2-violet bg-date2-lavenderMist text-date2-midnight"
                        : "bg-date2-midnight text-date2-white hover:bg-date2-deepIndigo"
                    }`}
                  >
                    {wasInserted ? "Inserted into message box" : "Insert Draft"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
