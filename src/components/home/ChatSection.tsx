"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { registerLogoutCleanup } from "@/lib/auth/sessionCleanup";
import {
  STORAGE_KEYS,
  getChatDraft,
  getHomeUiState,
  removeChatDraft,
  setChatDraft,
  subscribeToStorageKey,
  updateHomeUiState,
} from "@/lib/storage/localStorageManager";
import type {
  ChatConnectionStatus,
  ChatConversation,
  ChatMessage,
  DatePlanChatPayload,
} from "@/services/chat/chatService";
import { ProfileAvatar } from "./ProfileAvatar";
import { AiAssistantPanel } from "./workspace/AiAssistantPanel";
import { DatePlannerDrawer } from "./workspace/DatePlannerDrawer";

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
  onSendMessage: (
    conversationId: string,
    content: string,
    options?: {
      isEphemeral?: boolean;
      type?: "text" | "date_plan";
      datePlan?: DatePlanChatPayload;
    }
  ) => boolean;
  onRetryMessage?: (conversationId: string, clientMessageId: string) => void;
  onTypingChange: (conversationId: string, isTyping: boolean) => void;
  onPlayGameWithMatch: (conversationId: string) => void;
  onToggleVanishMode: (
    conversationId: string,
    nextEnabled: boolean
  ) => Promise<void>;
  vanishToggling?: boolean;
  vanishError?: string | null;
  onStartVideoCall: (conversation: ChatConversation) => void;
  onSimulateIncomingCall?: (conversation: ChatConversation) => void;
  startingCall?: boolean;
  callError?: string | null;
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
  onRetryMessage,
  onTypingChange,
  onPlayGameWithMatch,
  onToggleVanishMode,
  vanishToggling = false,
  vanishError = null,
  onStartVideoCall,
  onSimulateIncomingCall,
  startingCall = false,
  callError = null,
}: ChatSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  // Feature 5 Workspace Panels
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [datePlannerOpen, setDatePlannerOpen] = useState(false);
  const [copyBlockedNotice, setCopyBlockedNotice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isVanishActive = Boolean(activeConversation?.vanishEnabled);

  // In Vanish Mode show only ephemeral session messages; otherwise show normal history
  const displayedMessages: ChatMessage[] = useMemo(() => {
    const all = activeConversation?.messages ?? [];
    if (isVanishActive) {
      return all.filter((m) => m.isEphemeral);
    }
    return all.filter((m) => !m.isEphemeral);
  }, [activeConversation, isVanishActive]);

  useEffect(() => {
    setAiPanelOpen(getHomeUiState().aiPanelOpen);
    const unsubHome = subscribeToStorageKey(STORAGE_KEYS.HOME_STATE, () => {
      setAiPanelOpen(getHomeUiState().aiPanelOpen);
    });
    const unsubLogout = registerLogoutCleanup(() => {
      setDraft("");
      setDraftError(null);
      setSearchQuery("");
      setAiPanelOpen(false);
      setDatePlannerOpen(false);
      setMobileShowThread(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    });
    return () => {
      unsubHome();
      unsubLogout();
    };
  }, []);

  useEffect(() => {
    if (!activeConversation) {
      setDraft("");
      return;
    }

    if (isVanishActive) {
      // Never persist temporary Vanish Mode drafts or messages in Local Storage
      removeChatDraft(activeConversation.id);
      setDraft("");
      return;
    }

    setDraft(getChatDraft(activeConversation.id));

    return subscribeToStorageKey(STORAGE_KEYS.CHAT_DRAFTS, () => {
      setDraft(getChatDraft(activeConversation.id));
    });
  }, [activeConversation, isVanishActive]);

  useEffect(() => {
    if (selectedConversationId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversationId, displayedMessages.length]);

  useEffect(() => {
    if (selectedConversationId) {
      setMobileShowThread(true);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    return () => {
      if (copyNoticeTimerRef.current) clearTimeout(copyNoticeTimerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const showCopyRestrictedFeedback = () => {
    setCopyBlockedNotice(true);
    if (copyNoticeTimerRef.current) clearTimeout(copyNoticeTimerRef.current);
    copyNoticeTimerRef.current = setTimeout(() => {
      setCopyBlockedNotice(false);
    }, 2200);
  };

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
    const sent = onSendMessage(activeConversation.id, trimmed, {
      isEphemeral: isVanishActive,
    });
    if (sent) {
      removeChatDraft(activeConversation.id);
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
    if (isVanishActive) {
      removeChatDraft(activeConversation.id);
    } else {
      setChatDraft(activeConversation.id, next);
    }

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
          message="Local test chat mode active. Connect the Date² backend for live messaging, AI responses, and WebRTC signaling."
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

      {vanishError && <StatusBanner variant="error" message={vanishError} />}
      {callError && <StatusBanner variant="error" message={callError} />}

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

      <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-date2-border bg-date2-white font-helvetica shadow-card md:h-[calc(100dvh-14rem)] md:min-h-[540px] md:max-h-[760px] md:grid-cols-12">
        {/* LEFT SIDE: Conversation Sidebar */}
        <aside
          className={`flex min-h-0 flex-col border-b border-date2-border md:col-span-5 md:border-b-0 md:border-r lg:col-span-4 xl:col-span-3 ${
            mobileShowThread ? "hidden md:flex" : "flex min-h-[460px] md:min-h-0"
          }`}
        >
          <div className="space-y-3 border-b border-date2-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-date2-ink">Messages</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-date2-slate">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-date2-violet"
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

            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                aria-label="Search conversations"
                className="date2-input-base py-2 pr-14 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-date2-violet hover:bg-date2-lavenderMist"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 divide-y divide-date2-border/60 overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-date2-lavenderMist" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-24 animate-pulse rounded bg-date2-lavenderMist" />
                      <div className="h-3 w-40 animate-pulse rounded bg-date2-canvas" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-date2-slate">
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
                        ? "bg-date2-lavenderMist"
                        : "hover:bg-date2-canvas"
                    }`}
                  >
                    <ProfileAvatar
                      name={conv.participant.name}
                      photoUrl={conv.participant.photoUrl}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-date2-ink">
                          {conv.participant.name}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="shrink-0 text-[11px] text-date2-slate">
                            {formatMessageTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-date2-slate">
                          {conv.vanishEnabled
                            ? "Vanish Mode Active"
                            : conv.lastMessage ?? "Say hello!"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-date2-midnight px-1.5 text-[10px] font-bold text-date2-white">
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

        {/* CENTER/RIGHT: Active Conversation + Optional AI Assistant Sidebar */}
        <div
          className={`min-h-0 flex-col md:col-span-7 md:flex-row lg:col-span-8 lg:flex-row xl:col-span-9 ${
            mobileShowThread
              ? "fixed inset-0 z-40 flex h-[100dvh] bg-date2-white md:static md:z-auto md:h-auto"
              : "hidden md:flex"
          }`}
        >
          {!activeConversation ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-date2-lavenderMist text-date2-midnight">
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
              <h3 className="mt-3 text-base font-bold text-date2-ink">
                Select a conversation
              </h3>
              <p className="mt-1 max-w-xs text-xs text-date2-slate">
                Choose a match from the left to message, plan a date, turn on
                Vanish Mode, or start a video call.
              </p>
            </div>
          ) : (
            <>
              <section
                className={`flex min-h-0 min-w-0 flex-1 flex-col transition-colors duration-200 ${
                  isVanishActive ? "bg-[#10122E] text-white" : "bg-date2-white"
                }`}
              >
                {/* Active Conversation Header + Feature 5 Tools */}
                <header
                  className={`flex shrink-0 flex-col gap-2.5 border-b px-3 py-3 xs:px-4 sm:gap-3 sm:px-5 sm:py-3.5 ${
                    isVanishActive
                      ? "border-white/15 bg-[#161942]"
                      : "border-date2-border bg-date2-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => setMobileShowThread(false)}
                        aria-label="Back to conversations"
                        className={`rounded-lg border p-1.5 md:hidden ${
                          isVanishActive
                            ? "border-white/25 text-date2-paleLavender hover:bg-white/10"
                            : "border-date2-border text-date2-midnight hover:bg-date2-lavenderMist"
                        }`}
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
                        <div className="flex items-center gap-2">
                          <p
                            className={`truncate text-sm font-bold ${
                              isVanishActive ? "text-white" : "text-date2-ink"
                            }`}
                          >
                            {activeConversation.participant.name}
                            {activeConversation.participant.age !== undefined
                              ? `, ${activeConversation.participant.age}`
                              : ""}
                          </p>
                          {isVanishActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-date2-limeMark/20 px-2 py-0.5 text-[10px] font-semibold text-date2-limeMark">
                              Vanish Mode Active
                            </span>
                          )}
                        </div>
                        <p
                          className={`truncate text-xs ${
                            isVanishActive
                              ? "text-date2-paleLavender/85"
                              : "text-date2-slate"
                          }`}
                        >
                          {activeConversation.participant.location ??
                            "Matched on Date²"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onPlayGameWithMatch(activeConversation.id)
                      }
                      className={`shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isVanishActive
                          ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                          : "border-date2-border bg-date2-lavenderMist text-date2-midnight hover:bg-date2-paleLavender/70"
                      }`}
                    >
                      Play Game
                    </button>
                  </div>

                  {/* Feature 5 Workspace Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !aiPanelOpen;
                        setAiPanelOpen(next);
                        updateHomeUiState({ aiPanelOpen: next });
                      }}
                      aria-expanded={aiPanelOpen}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        aiPanelOpen
                          ? "border-date2-midnight bg-date2-midnight text-date2-white"
                          : isVanishActive
                            ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                            : "border-date2-border bg-date2-canvas text-date2-midnight hover:bg-date2-lavenderMist"
                      }`}
                    >
                      AI Chat
                    </button>

                    <button
                      type="button"
                      onClick={() => setDatePlannerOpen(true)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isVanishActive
                          ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                          : "border-date2-border bg-date2-canvas text-date2-midnight hover:bg-date2-lavenderMist"
                      }`}
                    >
                      Date Planner
                    </button>

                    <button
                      type="button"
                      disabled={vanishToggling}
                      aria-pressed={isVanishActive}
                      onClick={() =>
                        onToggleVanishMode(
                          activeConversation.id,
                          !isVanishActive
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                        isVanishActive
                          ? "border-date2-limeMark bg-date2-limeMark/20 text-date2-limeMark hover:bg-date2-limeMark/30"
                          : "border-date2-border bg-date2-canvas text-date2-midnight hover:bg-date2-lavenderMist"
                      }`}
                    >
                      {vanishToggling
                        ? "Updating..."
                        : isVanishActive
                          ? "Exit Vanish Mode"
                          : "Vanish Mode"}
                    </button>

                    <button
                      type="button"
                      disabled={startingCall}
                      onClick={() => onStartVideoCall(activeConversation)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-date2-midnight px-3 py-1.5 text-xs font-semibold text-date2-white shadow-sm transition-colors hover:bg-date2-deepIndigo disabled:opacity-60"
                    >
                      {startingCall ? "Calling..." : "Video Call"}
                    </button>

                    {isMock && onSimulateIncomingCall && (
                      <button
                        type="button"
                        onClick={() =>
                          onSimulateIncomingCall(activeConversation)
                        }
                        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                          isVanishActive
                            ? "border-white/20 text-date2-paleLavender hover:bg-white/10"
                            : "border-date2-border text-date2-slate hover:bg-date2-lavenderMist"
                        }`}
                      >
                        Test Incoming Call
                      </button>
                    )}
                  </div>
                </header>

                {/* Vanish Mode Notice */}
                {isVanishActive && (
                  <div className="border-b border-white/10 bg-[#1B1F4F] px-4 py-2 text-xs text-date2-paleLavender">
                    <strong>Vanish Mode Active:</strong> Messages sent here are
                    temporary and will be cleared when Vanish Mode is turned off
                    or your session ends. Normal chat history remains preserved.
                  </div>
                )}

                {copyBlockedNotice && (
                  <div
                    role="status"
                    className="border-b border-amber-400/30 bg-amber-950/60 px-4 py-1.5 text-center text-[11px] font-medium text-amber-200"
                  >
                    Copying temporary Vanish Mode messages is restricted.
                  </div>
                )}

                {/* Message History */}
                <div
                  onCopy={
                    isVanishActive
                      ? (e) => {
                          e.preventDefault();
                          showCopyRestrictedFeedback();
                        }
                      : undefined
                  }
                  onContextMenu={
                    isVanishActive
                      ? (e) => {
                          e.preventDefault();
                          showCopyRestrictedFeedback();
                        }
                      : undefined
                  }
                  className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 xs:p-4 sm:p-5 ${
                    isVanishActive
                      ? "select-none bg-[#10122E]"
                      : "bg-date2-canvas/60"
                  }`}
                >
                  {displayedMessages.length === 0 ? (
                    <div
                      className={`flex h-full min-h-[260px] items-center justify-center text-center text-xs ${
                        isVanishActive
                          ? "text-date2-paleLavender/80"
                          : "text-date2-slate"
                      }`}
                    >
                      {isVanishActive
                        ? `Vanish Mode is active. Send a temporary message to ${activeConversation.participant.name}.`
                        : `No messages yet. Say hello to ${activeConversation.participant.name}!`}
                    </div>
                  ) : (
                    displayedMessages.map((msg) => {
                      const isMine = msg.senderId === currentUserId;

                      if (msg.type === "game_result" && msg.gameResult) {
                        return (
                          <div
                            key={msg.id}
                            className="mx-auto max-w-sm rounded-2xl border border-date2-paleLavender bg-date2-lavenderMist p-3.5 text-center text-date2-ink shadow-sm"
                          >
                            <p className="text-[11px] font-bold uppercase tracking-wider text-date2-violet">
                              {msg.gameResult.gameName} Result
                            </p>
                            {msg.gameResult.scoreLabel && (
                              <p className="mt-1 text-base font-bold text-date2-ink">
                                {msg.gameResult.scoreLabel}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-date2-slate">
                              {msg.gameResult.summary}
                            </p>
                          </div>
                        );
                      }

                      if (msg.type === "date_plan" && msg.datePlan) {
                        return (
                          <div
                            key={msg.id}
                            className={`max-w-md space-y-2.5 rounded-2xl border p-4 shadow-sm ${
                              isMine ? "ml-auto" : "mr-auto"
                            } border-date2-paleLavender bg-date2-lavenderMist text-date2-ink`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-date2-violet">
                                Date Plan · {msg.datePlan.vibe}
                              </span>
                              <span className="rounded-full bg-date2-white px-2 py-0.5 text-[10px] font-semibold text-date2-slate">
                                {msg.datePlan.budget}
                              </span>
                            </div>
                            <p className="text-sm font-bold text-date2-ink">
                              {msg.datePlan.planTitle}
                            </p>
                            <p className="text-xs text-date2-slate">
                              {msg.datePlan.location} · {msg.datePlan.schedule}
                            </p>
                            <ul className="space-y-1.5 pt-1">
                              {msg.datePlan.items.map((stop) => (
                                <li
                                  key={stop.id}
                                  className="rounded-xl border border-date2-border bg-date2-white px-3 py-2 text-xs"
                                >
                                  <p className="font-semibold text-date2-ink">
                                    {stop.activityName}
                                  </p>
                                  <p className="text-[11px] text-date2-slate">
                                    {stop.location} · {stop.suggestedTime}
                                  </p>
                                </li>
                              ))}
                            </ul>
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
                            className={`max-w-[82%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[70%] ${
                              isVanishActive
                                ? isMine
                                  ? "rounded-br-md border border-date2-softPeriwinkle/50 bg-date2-violet text-white"
                                  : "rounded-bl-md border border-white/15 bg-[#1E2257] text-white"
                                : isMine
                                  ? "rounded-br-md bg-date2-midnight text-date2-white"
                                  : "rounded-bl-md border border-date2-border bg-date2-white text-date2-ink shadow-sm"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <div
                            className={`mt-1 flex items-center gap-1.5 px-1 text-[10px] ${
                              isVanishActive
                                ? "text-date2-paleLavender/75"
                                : "text-date2-slate"
                            }`}
                          >
                            {msg.createdAt && (
                              <span>{formatMessageTime(msg.createdAt)}</span>
                            )}
                            {msg.isEphemeral && <span>· Temporary</span>}
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
                            {isMine &&
                              msg.status === "failed" &&
                              msg.clientMessageId &&
                              onRetryMessage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRetryMessage(
                                      activeConversation.id,
                                      msg.clientMessageId!
                                    )
                                  }
                                  className={`font-semibold underline underline-offset-2 ${
                                    isVanishActive
                                      ? "text-date2-limeMark"
                                      : "text-date2-violet hover:text-date2-midnight"
                                  }`}
                                >
                                  Retry
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {partnerTypingLabel && (
                    <div
                      aria-live="polite"
                      className="inline-flex items-center gap-2 rounded-full border border-date2-border bg-date2-white px-3 py-1.5 text-xs text-date2-slate shadow-sm"
                    >
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-date2-violet" />
                      <span>{partnerTypingLabel} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div
                  className={`shrink-0 border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] xs:px-4 sm:p-4 ${
                    isVanishActive
                      ? "border-white/15 bg-[#161942]"
                      : "border-date2-border bg-date2-white"
                  }`}
                >
                  {draftError && (
                    <p
                      role="alert"
                      className="mb-2 text-xs font-medium text-rose-500"
                    >
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
                      placeholder={
                        isVanishActive
                          ? `Send temporary message to ${activeConversation.participant.name}...`
                          : `Message ${activeConversation.participant.name}... (Enter to send, Shift+Enter for new line)`
                      }
                      aria-label="Message input"
                      className={`max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-base transition-colors focus:outline-none focus:ring-4 sm:text-sm ${
                        isVanishActive
                          ? "border-white/20 bg-[#10122E] text-white placeholder:text-date2-paleLavender/65 focus:border-date2-softPeriwinkle focus:ring-date2-softPeriwinkle/25"
                          : "border-date2-border bg-date2-white text-date2-ink placeholder:text-date2-muted focus:border-date2-violet focus:ring-date2-paleLavender"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      className={`inline-flex h-[42px] shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-soft transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender ${
                        isVanishActive
                          ? "bg-date2-limeMark text-date2-midnight hover:bg-date2-limeMark/90"
                          : "bg-date2-midnight text-date2-white hover:bg-date2-deepIndigo"
                      }`}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </section>

              {/* Collapsible Right-hand AI Assistant Sidebar */}
              {aiPanelOpen && (
                <div className="max-h-[42dvh] w-full shrink-0 overflow-hidden lg:h-full lg:max-h-none lg:w-72 xl:w-80">
                  <AiAssistantPanel
                    conversation={activeConversation}
                    currentUserId={currentUserId}
                    onInsertSuggestion={(text) => {
                      setDraft(text);
                      setDraftError(null);
                      if (activeConversation && !isVanishActive) {
                        setChatDraft(activeConversation.id, text);
                      }
                    }}
                    onClose={() => {
                      setAiPanelOpen(false);
                      updateHomeUiState({ aiPanelOpen: false });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Date Planner Drawer */}
      {datePlannerOpen && activeConversation && (
        <DatePlannerDrawer
          conversationId={activeConversation.id}
          matchName={activeConversation.participant.name}
          initialLocation={activeConversation.participant.location}
          onSharePlan={(plan) => {
            onSendMessage(
              activeConversation.id,
              `Date Plan: ${plan.planTitle} (${plan.schedule})`,
              {
                type: "date_plan",
                datePlan: plan,
                isEphemeral: isVanishActive,
              }
            );
          }}
          onClose={() => setDatePlannerOpen(false)}
        />
      )}
    </div>
  );
}
