"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import type {
  ChatConnectionStatus,
  ChatConversation,
  ChatMessage,
} from "@/services/chat/chatService";
import { ProfileAvatar } from "./ProfileAvatar";

interface ChatSectionProps {
  conversations: ChatConversation[];
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  connectionStatus: ChatConnectionStatus;
  typingByConversation: Record<string, string | null>;
  loading: boolean;
  loadError: string | null;
  isMock: boolean;
  onRetryLoad: () => void;
  onSendMessage: (conversationId: string, content: string) => boolean;
  onTypingChange: (conversationId: string, isTyping: boolean) => void;
  onPlayGameWithMatch: (conversationId: string) => void;
}

function formatMessageTime(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ChatSection({
  conversations,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  connectionStatus,
  typingByConversation,
  loading,
  loadError,
  isMock,
  onRetryLoad,
  onSendMessage,
  onTypingChange,
  onPlayGameWithMatch,
}: ChatSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.participant.name.toLowerCase().includes(q) ||
        (c.lastMessage ?? "").toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const activeMessages: ChatMessage[] = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation]
  );

  useEffect(() => {
    if (selectedConversationId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversationId, activeMessages.length]);

  useEffect(() => {
    if (selectedConversationId) {
      setMobileShowThread(true);
    }
  }, [selectedConversationId]);

  const handleOpenConversation = (id: string) => {
    onSelectConversation(id);
    setMobileShowThread(true);
    setDraftError(null);
  };

  const handleSend = () => {
    if (!activeConversation) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraftError("Type a message before sending.");
      return;
    }

    setDraftError(null);
    const sent = onSendMessage(activeConversation.id, trimmed);
    if (sent) {
      setDraft("");
      onTypingChange(activeConversation.id, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleDraftChange = (next: string) => {
    setDraft(next);
    if (draftError && next.trim()) setDraftError(null);

    if (!activeConversation) return;
    onTypingChange(activeConversation.id, next.trim().length > 0);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(activeConversation.id, false);
    }, 1500);
  };

  const partnerTypingLabel = activeConversation
    ? typingByConversation[activeConversation.id]
    : null;

  return (
    <div className="space-y-4">
      {isMock && (
        <StatusBanner
          variant="info"
          message="Local test chat mode active. Connect the Date² backend WebSocket (/v1/chat/stream) for live multi-user messaging."
        />
      )}

      {loadError && (
        <StatusBanner
          variant="error"
          message={loadError}
          action={
            <button
              type="button"
              onClick={onRetryLoad}
              className="text-xs font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          }
        />
      )}

      {(connectionStatus === "reconnecting" || connectionStatus === "error") && (
        <StatusBanner
          variant="warning"
          message={
            connectionStatus === "reconnecting"
              ? "Chat connection interrupted. Reconnecting automatically..."
              : "Real-time chat connection encountered an issue."
          }
        />
      )}

      <div className="grid min-h-[540px] grid-cols-1 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-card lg:grid-cols-12">
        {/* LEFT SIDE: Conversation Sidebar */}
        <aside
          className={`flex flex-col border-b border-brand-border lg:col-span-4 lg:border-b-0 lg:border-r ${
            mobileShowThread ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="border-b border-brand-border/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-brand-ink">Messages</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-muted">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-brand-mint"
                      : connectionStatus === "connecting" ||
                          connectionStatus === "reconnecting"
                        ? "bg-amber-500 animate-pulse"
                        : "bg-rose-500"
                  }`}
                />
                {connectionStatus === "connected"
                  ? "Live"
                  : connectionStatus === "reconnecting"
                    ? "Reconnecting"
                    : connectionStatus === "connecting"
                      ? "Connecting"
                      : "Offline"}
              </span>
            </div>

            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="auth-input-base py-2 text-xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-brand-border/50">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-brand-ice" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-24 animate-pulse rounded bg-brand-ice" />
                      <div className="h-3 w-40 animate-pulse rounded bg-brand-canvas" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-brand-muted">
                {searchQuery
                  ? "No conversations match your search."
                  : "No matches yet. Like profiles in Match to start a conversation."}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConversationId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleOpenConversation(conv.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      isSelected
                        ? "bg-brand-ice/80"
                        : "hover:bg-brand-canvas"
                    }`}
                  >
                    <ProfileAvatar
                      name={conv.participant.name}
                      photoUrl={conv.participant.photoUrl}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-brand-ink">
                          {conv.participant.name}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="shrink-0 text-[11px] text-brand-muted">
                            {formatMessageTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-brand-muted">
                          {conv.lastMessage ?? "Say hello!"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-forest px-1.5 text-[10px] font-bold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT SIDE: Active Conversation */}
        <section
          className={`flex flex-col lg:col-span-8 ${
            mobileShowThread ? "flex" : "hidden lg:flex"
          }`}
        >
          {!activeConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-ice text-brand-forest">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-7 w-7"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="mt-3 text-base font-bold text-brand-ink">
                Select a conversation
              </h3>
              <p className="mt-1 max-w-xs text-xs text-brand-muted">
                Choose a match from the left to view your messages or invite
                them to play a game.
              </p>
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
              <header className="flex items-center justify-between gap-3 border-b border-brand-border/70 px-4 py-3.5 sm:px-6">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileShowThread(false)}
                    aria-label="Back to conversations"
                    className="rounded-lg border border-brand-border p-1.5 text-brand-forest hover:bg-brand-ice lg:hidden"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  <ProfileAvatar
                    name={activeConversation.participant.name}
                    photoUrl={activeConversation.participant.photoUrl}
                    size="sm"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-brand-ink">
                      {activeConversation.participant.name}
                      {activeConversation.participant.age !== undefined
                        ? `, ${activeConversation.participant.age}`
                        : ""}
                    </p>
                    <p className="truncate text-xs text-brand-muted">
                      {activeConversation.participant.location ??
                        "Matched on Date²"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onPlayGameWithMatch(activeConversation.id)}
                  className="shrink-0 rounded-xl border border-brand-border bg-brand-ice/80 px-3 py-1.5 text-xs font-semibold text-brand-forest transition-colors hover:bg-brand-frost"
                >
                  Play Game
                </button>
              </header>

              {/* Message History */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-brand-canvas/45 p-4 sm:p-6">
                {activeMessages.length === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center text-center text-xs text-brand-muted">
                    No messages yet. Say hello to{" "}
                    {activeConversation.participant.name}!
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isMine = msg.senderId === currentUserId;

                    if (msg.type === "game_result" && msg.gameResult) {
                      return (
                        <div
                          key={msg.id}
                          className="mx-auto max-w-sm rounded-2xl border border-brand-mint/70 bg-brand-ice p-3.5 text-center shadow-sm"
                        >
                          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest">
                            {msg.gameResult.gameName} Result
                          </p>
                          {msg.gameResult.scoreLabel && (
                            <p className="mt-1 text-base font-bold text-brand-ink">
                              {msg.gameResult.scoreLabel}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-brand-muted">
                            {msg.gameResult.summary}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMine ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words sm:max-w-[70%] ${
                            isMine
                              ? "rounded-br-md bg-brand-forest text-white"
                              : "rounded-bl-md border border-brand-border bg-white text-brand-ink shadow-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-brand-muted">
                          {msg.createdAt && (
                            <span>{formatMessageTime(msg.createdAt)}</span>
                          )}
                          {isMine && msg.status && (
                            <span>
                              ·{" "}
                              {msg.status === "sending"
                                ? "Sending..."
                                : msg.status === "failed"
                                  ? "Failed"
                                  : "Sent"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {partnerTypingLabel && (
                  <div
                    aria-live="polite"
                    className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-muted shadow-sm"
                  >
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-mint" />
                    <span>{partnerTypingLabel} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="border-t border-brand-border/70 bg-white p-3 sm:p-4">
                {draftError && (
                  <p role="alert" className="mb-2 text-xs font-medium text-rose-600">
                    {draftError}
                  </p>
                )}
                <div className="flex items-end gap-2.5">
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={`Message ${activeConversation.participant.name}... (Enter to send, Shift+Enter for new line)`}
                    aria-label="Message input"
                    className="auth-input-base max-h-28 min-h-[42px] flex-1 resize-none py-2.5"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-xl bg-brand-forest px-4 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/35"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
