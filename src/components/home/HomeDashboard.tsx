"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AuthUser } from "@/services/auth/types";
import {
  ChatServiceError,
  chatService,
  type ChatConnectionStatus,
  type ChatConversation,
  type ChatMessage,
  type ChatSocketConnection,
  type ChatStreamEvent,
} from "@/services/chat/chatService";
import { ChatSection } from "./ChatSection";
import { GameSection } from "./GameSection";
import { MatchSection } from "./MatchSection";
import { ProfileAvatar } from "./ProfileAvatar";

type DashboardTab = "match" | "chat" | "game";

interface HomeDashboardProps {
  user?: AuthUser;
}

function mergeIncomingMessage(
  existing: ChatMessage[],
  incoming: ChatMessage
): ChatMessage[] {
  const alreadyExists = existing.some(
    (m) =>
      m.id === incoming.id ||
      (incoming.clientMessageId &&
        m.clientMessageId === incoming.clientMessageId)
  );
  if (alreadyExists) {
    return existing.map((m) =>
      m.id === incoming.id ||
      (incoming.clientMessageId &&
        m.clientMessageId === incoming.clientMessageId)
        ? { ...m, ...incoming, status: "sent" }
        : m
    );
  }
  return [...existing, { ...incoming, status: incoming.status ?? "sent" }];
}

export function HomeDashboard({ user }: HomeDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("match");

  // Shared Chat & Match-derived Conversations State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>(
    user?.id ?? "current-user"
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null
  );
  const [isChatMock, setIsChatMock] = useState(false);

  const [chatConnectionStatus, setChatConnectionStatus] =
    useState<ChatConnectionStatus>("disconnected");
  const [typingByConversation, setTypingByConversation] = useState<
    Record<string, string | null>
  >({});

  const socketRef = useRef<ChatSocketConnection | null>(null);
  const selectedConvRef = useRef<string | null>(null);
  const activeTabRef = useRef<DashboardTab>(activeTab);

  selectedConvRef.current = selectedConversationId;
  activeTabRef.current = activeTab;

  const loadConversations = useCallback(async (signal?: AbortSignal) => {
    setLoadingConversations(true);
    setConversationsError(null);
    try {
      const response = await chatService.getConversations(signal);
      setConversations(response.conversations ?? []);
      if (response.currentUserId) {
        setCurrentUserId(response.currentUserId);
      }
      setIsChatMock(Boolean(response.isMockResponse));

      setSelectedConversationId((prev) => {
        if (prev && response.conversations.some((c) => c.id === prev)) {
          return prev;
        }
        return response.conversations[0]?.id ?? null;
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setConversationsError(
        err instanceof ChatServiceError
          ? err.message
          : "Unable to load your conversations."
      );
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const handleStreamEvent = useCallback((event: ChatStreamEvent) => {
    if (event.type === "message") {
      const msg = event.message;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversationId);
        if (!exists) return prev;

        return prev.map((conv) => {
          if (conv.id !== msg.conversationId) return conv;
          const isCurrentlyViewing =
            activeTabRef.current === "chat" &&
            selectedConvRef.current === conv.id;

          return {
            ...conv,
            messages: mergeIncomingMessage(conv.messages ?? [], msg),
            lastMessage: msg.content,
            lastMessageAt: msg.createdAt ?? conv.lastMessageAt,
            unreadCount: isCurrentlyViewing ? 0 : conv.unreadCount + 1,
          };
        });
      });
      return;
    }

    if (event.type === "message_ack") {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          messages: (conv.messages ?? []).map((m) =>
            m.clientMessageId === event.clientMessageId
              ? {
                  ...m,
                  id: event.messageId || m.id,
                  createdAt: event.createdAt ?? m.createdAt,
                  status: "sent",
                }
              : m
          ),
        }))
      );
      return;
    }

    if (event.type === "typing") {
      setTypingByConversation((prev) => ({
        ...prev,
        [event.conversationId]: event.isTyping
          ? event.userName || "Match"
          : null,
      }));
      return;
    }

    if (event.type === "read") {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadConversations(controller.signal);

    socketRef.current = chatService.connectStream({
      onStatusChange: setChatConnectionStatus,
      onEvent: handleStreamEvent,
    });

    return () => {
      controller.abort();
      socketRef.current?.close();
    };
  }, [loadConversations, handleStreamEvent]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );
    socketRef.current?.markRead(conversationId);
  }, []);

  const handleSendMessage = useCallback(
    (conversationId: string, content: string): boolean => {
      const clientMessageId = `client-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const optimistic: ChatMessage = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: currentUserId,
        content,
        type: "text",
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      const sent =
        socketRef.current?.sendMessage({
          conversationId,
          content,
          clientMessageId,
        }) ?? false;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [
                  ...(c.messages ?? []),
                  { ...optimistic, status: sent ? "sending" : "failed" },
                ],
                lastMessage: content,
                lastMessageAt: optimistic.createdAt,
              }
            : c
        )
      );

      return sent;
    },
    [currentUserId]
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const tabs: { id: DashboardTab; label: string; badge?: number }[] = [
    { id: "match", label: "Match" },
    { id: "chat", label: "Chat", badge: totalUnread },
    { id: "game", label: "Game" },
  ];

  return (
    <div className="relative flex min-h-screen flex-col pb-20 sm:pb-8">
      {/* Persistent Date² Dashboard Header */}
      <header className="sticky top-0 z-30 border-b border-brand-border/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Link
            href="/home"
            className="inline-flex items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-mint/30"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-forest text-white shadow-soft"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20s-7-4.5-7-10a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 10c0 5.5-7 10-7 10Z" />
                <circle cx="12" cy="10" r="1.5" fill="#4FD4C4" stroke="none" />
              </svg>
            </span>
            <span className="text-xl font-bold tracking-tight text-brand-ink">
              Date<span className="text-brand-mint">²</span>
            </span>
          </Link>

          {/* Desktop & Tablet Primary Navigation */}
          <nav
            aria-label="Dashboard sections"
            className="hidden items-center gap-1 rounded-2xl border border-brand-border bg-brand-canvas p-1 sm:flex"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "chat" && selectedConversationId) {
                      handleSelectConversation(selectedConversationId);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-forest text-white shadow-sm"
                      : "text-brand-muted hover:bg-brand-ice hover:text-brand-forest"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        isActive
                          ? "bg-brand-mint text-brand-forest"
                          : "bg-brand-forest text-white"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Quick Access */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/onboarding/personal-info"
              title="Edit your personal information and interests"
              className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white py-1 pl-1 pr-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand-ice"
            >
              <ProfileAvatar name={user?.username ?? "Date²"} size="sm" />
              <span className="hidden md:inline">
                {user?.username ? `@${user.username}` : "Profile"}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area (All 3 panels remain mounted to preserve state across tabs) */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className={activeTab === "match" ? "block" : "hidden"}>
          <MatchSection
            isActive={activeTab === "match"}
            currentUserName={user?.username ?? "You"}
            onMatchConfirmed={() => {
              loadConversations();
            }}
            onOpenChatFromMatch={async (conversationId) => {
              await loadConversations();
              if (conversationId) {
                handleSelectConversation(conversationId);
              }
              setActiveTab("chat");
            }}
          />
        </div>

        <div className={activeTab === "chat" ? "block" : "hidden"}>
          <ChatSection
            conversations={conversations}
            currentUserId={currentUserId}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            connectionStatus={chatConnectionStatus}
            typingByConversation={typingByConversation}
            loading={loadingConversations}
            loadError={conversationsError}
            isMock={isChatMock}
            onRetryLoad={() => loadConversations()}
            onSendMessage={handleSendMessage}
            onTypingChange={(convId, typing) =>
              socketRef.current?.sendTyping({
                conversationId: convId,
                isTyping: typing,
              })
            }
            onPlayGameWithMatch={(convId) => {
              setSelectedConversationId(convId);
              setActiveTab("game");
            }}
          />
        </div>

        <div className={activeTab === "game" ? "block" : "hidden"}>
          <GameSection
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onGoToMatch={() => setActiveTab("match")}
            onReturnToChat={async (convId) => {
              await loadConversations();
              handleSelectConversation(convId);
              setActiveTab("chat");
            }}
            onGameCompleted={() => {
              loadConversations();
            }}
          />
        </div>
      </main>

      {/* Responsive Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile dashboard sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-border bg-white/95 px-4 py-2 backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "chat" && selectedConversationId) {
                    handleSelectConversation(selectedConversationId);
                  }
                }}
                className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-forest text-white"
                    : "text-brand-muted hover:bg-brand-ice"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-mint px-1 text-[10px] font-bold text-brand-forest">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
