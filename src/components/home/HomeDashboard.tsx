"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Date2Logo } from "@/components/auth/Date2Logo";
import { ProfileAccountMenu } from "@/components/auth/ProfileAccountMenu";
import { registerLogoutCleanup } from "@/lib/auth/sessionCleanup";
import {
  STORAGE_KEYS,
  getHomeUiState,
  subscribeToStorageKey,
  updateHomeUiState,
} from "@/lib/storage/localStorageManager";
import type { AuthUser } from "@/services/auth/types";
import {
  ChatServiceError,
  chatService,
  type ChatConnectionStatus,
  type ChatConversation,
  type ChatMessage,
  type ChatSocketConnection,
  type ChatStreamEvent,
  type DatePlanChatPayload,
} from "@/services/chat/chatService";
import { clearMockEphemeralMessages } from "@/services/chat/mockChatService";
import { ChatSection } from "./ChatSection";
import { GameSection } from "./GameSection";
import { MatchSection } from "./MatchSection";
import {
  IncomingCallPrompt,
  type IncomingCallData,
} from "./workspace/IncomingCallPrompt";
import {
  VideoCallOverlay,
  type ActiveVcCall,
} from "./workspace/VideoCallOverlay";

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

  // Feature 5: Vanish Mode & Video Call State
  const [vanishToggling, setVanishToggling] = useState(false);
  const [vanishError, setVanishError] = useState<string | null>(null);

  const [startingCall, setStartingCall] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null
  );
  const [incomingCallBusy, setIncomingCallBusy] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveVcCall | null>(null);
  const [vcSignal, setVcSignal] = useState<{
    signalType: "offer" | "answer" | "ice_candidate" | "ended" | "declined";
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  } | null>(null);

  const socketRef = useRef<ChatSocketConnection | null>(null);
  const selectedConvRef = useRef<string | null>(null);
  const conversationsRef = useRef<ChatConversation[]>([]);
  conversationsRef.current = conversations;
  const activeTabRef = useRef<DashboardTab>(activeTab);
  const activeCallRef = useRef<ActiveVcCall | null>(null);

  selectedConvRef.current = selectedConversationId;
  activeTabRef.current = activeTab;
  activeCallRef.current = activeCall;

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
        const candidateId = prev ?? getHomeUiState().selectedConversationId;
        if (
          candidateId &&
          response.conversations.some((c) => c.id === candidateId)
        ) {
          return candidateId;
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
            lastMessage: msg.isEphemeral ? conv.lastMessage : msg.content,
            lastMessageAt: msg.isEphemeral
              ? conv.lastMessageAt
              : msg.createdAt ?? conv.lastMessageAt,
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
      return;
    }

    if (event.type === "vanish_mode") {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === event.conversationId
            ? {
                ...c,
                vanishEnabled: event.enabled,
                messages: event.enabled
                  ? c.messages
                  : (c.messages ?? []).filter((m) => !m.isEphemeral),
              }
            : c
        )
      );
      return;
    }

    if (event.type === "vc_incoming") {
      if (!activeCallRef.current) {
        setIncomingCall({
          callId: event.callId,
          conversationId: event.conversationId,
          callerId: event.callerId,
          callerName: event.callerName,
          callerPhotoUrl: event.callerPhotoUrl,
        });
      }
      return;
    }

    if (event.type === "vc_signal") {
      setVcSignal({
        signalType: event.signalType,
        sdp: event.sdp,
        candidate: event.candidate,
      });
    }
  }, []);

  useEffect(() => {
    const savedHome = getHomeUiState();
    setActiveTab(savedHome.activeTab);
    if (savedHome.selectedConversationId) {
      setSelectedConversationId(savedHome.selectedConversationId);
    }

    const unsubHomeStorage = subscribeToStorageKey(
      STORAGE_KEYS.HOME_STATE,
      () => {
        const latest = getHomeUiState();
        setActiveTab(latest.activeTab);
        if (latest.selectedConversationId !== null) {
          setSelectedConversationId(latest.selectedConversationId);
        }
      }
    );

    const controller = new AbortController();
    loadConversations(controller.signal);

    socketRef.current = chatService.connectStream({
      onStatusChange: setChatConnectionStatus,
      onEvent: handleStreamEvent,
    });

    const unregisterLogout = registerLogoutCleanup(() => {
      socketRef.current?.close();
      socketRef.current = null;
      clearMockEphemeralMessages();
      setActiveCall(null);
      setIncomingCall(null);
      setConversations([]);
      setSelectedConversationId(null);
      setActiveTab("match");
    });

    return () => {
      unsubHomeStorage();
      unregisterLogout();
      controller.abort();
      socketRef.current?.close();
    };
  }, [loadConversations, handleStreamEvent]);

  const switchTab = useCallback((nextTab: DashboardTab) => {
    setActiveTab(nextTab);
    updateHomeUiState({ activeTab: nextTab });
  }, []);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setVanishError(null);
    setCallError(null);
    setSelectedConversationId(conversationId);
    updateHomeUiState({ selectedConversationId: conversationId });
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return { ...c, unreadCount: 0 };
        }
        // Clear ephemeral messages from conversations when exiting them
        return c.vanishEnabled
          ? {
              ...c,
              messages: (c.messages ?? []).filter((m) => !m.isEphemeral),
            }
          : c;
      })
    );
    socketRef.current?.markRead(conversationId);
  }, []);

  const handleSendMessage = useCallback(
    (
      conversationId: string,
      content: string,
      options?: {
        isEphemeral?: boolean;
        type?: "text" | "date_plan";
        datePlan?: DatePlanChatPayload;
      }
    ): boolean => {
      const clientMessageId = `client-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const optimistic: ChatMessage = {
        id: clientMessageId,
        clientMessageId,
        conversationId,
        senderId: currentUserId,
        content,
        type: options?.type ?? "text",
        datePlan: options?.datePlan,
        isEphemeral: Boolean(options?.isEphemeral),
        createdAt: new Date().toISOString(),
        status: "sending",
      };

      const sent =
        socketRef.current?.sendMessage({
          conversationId,
          content,
          clientMessageId,
          isEphemeral: options?.isEphemeral,
          type: options?.type,
          datePlan: options?.datePlan,
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
                lastMessage: options?.isEphemeral
                  ? c.lastMessage
                  : options?.type === "date_plan" && options.datePlan
                    ? `Shared date plan: ${options.datePlan.planTitle}`
                    : content,
                lastMessageAt: options?.isEphemeral
                  ? c.lastMessageAt
                  : optimistic.createdAt,
              }
            : c
        )
      );

      return sent;
    },
    [currentUserId]
  );

  const handleRetryMessage = useCallback(
    (conversationId: string, clientMessageId: string) => {
      const targetConv = conversationsRef.current.find(
        (c) => c.id === conversationId
      );
      const targetMsg = targetConv?.messages?.find(
        (m) => m.clientMessageId === clientMessageId
      );
      if (!targetMsg) return false;

      const sent =
        socketRef.current?.sendMessage({
          conversationId,
          content: targetMsg.content,
          clientMessageId,
          isEphemeral: targetMsg.isEphemeral,
          type: targetMsg.type === "date_plan" ? "date_plan" : "text",
          datePlan: targetMsg.datePlan,
        }) ?? false;

      if (sent) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: (c.messages ?? []).map((m) =>
                    m.clientMessageId === clientMessageId
                      ? { ...m, status: "sending" }
                      : m
                  ),
                }
              : c
          )
        );
      }

      return sent;
    },
    []
  );

  const handleToggleVanishMode = async (
    conversationId: string,
    nextEnabled: boolean
  ) => {
    if (vanishToggling) return;
    setVanishToggling(true);
    setVanishError(null);
    try {
      const res = await chatService.toggleVanishMode(
        conversationId,
        nextEnabled
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                vanishEnabled: res.vanishEnabled,
                messages: res.vanishEnabled
                  ? c.messages
                  : (c.messages ?? []).filter((m) => !m.isEphemeral),
              }
            : c
        )
      );
    } catch (err) {
      setVanishError(
        err instanceof ChatServiceError
          ? err.message
          : "Unable to toggle Vanish Mode right now."
      );
    } finally {
      setVanishToggling(false);
    }
  };

  const handleStartVideoCall = async (conversation: ChatConversation) => {
    if (startingCall || activeCall) return;
    setStartingCall(true);
    setCallError(null);
    setVcSignal(null);

    try {
      const res = await chatService.sendVcRequest(conversation.id, {
        action: "initiate",
      });

      setActiveCall({
        callId: res.callId,
        conversationId: conversation.id,
        partnerName: conversation.participant.name,
        partnerPhotoUrl: conversation.participant.photoUrl,
        direction: "outgoing",
        iceServers: res.iceServers,
        isMock: res.isMockResponse,
      });
    } catch (err) {
      setCallError(
        err instanceof ChatServiceError
          ? err.message
          : "Unable to initiate video call."
      );
    } finally {
      setStartingCall(false);
    }
  };

  const handleAcceptIncomingCall = async (call: IncomingCallData) => {
    if (incomingCallBusy) return;
    setIncomingCallBusy(true);
    setCallError(null);
    setVcSignal(null);

    try {
      const res = await chatService.sendVcRequest(call.conversationId, {
        action: "accept",
        callId: call.callId,
      });
      setIncomingCall(null);
      setActiveCall({
        callId: res.callId || call.callId,
        conversationId: call.conversationId,
        partnerName: call.callerName,
        partnerPhotoUrl: call.callerPhotoUrl,
        direction: "incoming",
        iceServers: res.iceServers,
        isMock: res.isMockResponse,
      });
    } catch (err) {
      setCallError(
        err instanceof ChatServiceError
          ? err.message
          : "Unable to accept incoming video call."
      );
      setIncomingCall(null);
    } finally {
      setIncomingCallBusy(false);
    }
  };

  const handleDeclineIncomingCall = async (call: IncomingCallData) => {
    if (incomingCallBusy) return;
    setIncomingCallBusy(true);
    try {
      await chatService.sendVcRequest(call.conversationId, {
        action: "decline",
        callId: call.callId,
      });
      socketRef.current?.sendVcSignal({
        conversationId: call.conversationId,
        callId: call.callId,
        signalType: "declined",
      });
    } catch {
      // Dismiss prompt safely
    } finally {
      setIncomingCall(null);
      setIncomingCallBusy(false);
    }
  };

  const handleEndCall = async (call: ActiveVcCall) => {
    setActiveCall(null);
    setVcSignal(null);
    try {
      socketRef.current?.sendVcSignal({
        conversationId: call.conversationId,
        callId: call.callId,
        signalType: "ended",
      });
      await chatService.sendVcRequest(call.conversationId, {
        action: "end",
        callId: call.callId,
      });
    } catch {
      // Local media already stopped & cleaned up
    }
  };

  const handleBlockAndEnd = async (call: ActiveVcCall) => {
    await handleEndCall(call);
    setConversations((prev) =>
      prev.filter((c) => c.id !== call.conversationId)
    );
    if (selectedConversationId === call.conversationId) {
      setSelectedConversationId(null);
    }
  };

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
    <div className="date2-auth-backdrop relative flex min-h-screen flex-col pb-24 font-helvetica text-date2-ink sm:pb-8">
      {/* Persistent Date² Dashboard Header */}
      <header className="sticky top-0 z-30 border-b border-date2-border bg-date2-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-3 xs:px-4 sm:px-6 lg:px-10 desktop:max-w-[1400px]">
          <Link
            href="/home"
            className="inline-flex shrink-0 items-center rounded-xl py-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-date2-paleLavender"
          >
            <Date2Logo height={24} showContainer={false} />
          </Link>

          {/* Desktop & Tablet Primary Navigation */}
          <nav
            aria-label="Dashboard sections"
            className="hidden items-center gap-1 rounded-2xl border border-date2-border bg-date2-canvas p-1 sm:flex"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => {
                    switchTab(tab.id);
                    if (tab.id === "chat" && selectedConversationId) {
                      handleSelectConversation(selectedConversationId);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-date2-midnight text-date2-white shadow-sm"
                      : "text-date2-slate hover:bg-date2-lavenderMist hover:text-date2-midnight"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                        isActive
                          ? "bg-date2-limeMark text-date2-midnight"
                          : "bg-date2-midnight text-date2-white"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout Menu */}
          <ProfileAccountMenu username={user?.username} theme="date2" />
        </div>
      </header>

      {/* Main Content Area (All 3 panels remain mounted to preserve state across tabs) */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 xs:px-4 sm:px-6 sm:py-6 lg:px-10 desktop:max-w-[1400px]">
        {/* Responsive Quick Overview Bar */}
        <section
          aria-label="Dashboard overview"
          className="mb-4 grid grid-cols-3 gap-1.5 sm:mb-6 sm:gap-4"
        >
          <button
            type="button"
            onClick={() => switchTab("match")}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all sm:justify-between sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-left ${
              activeTab === "match"
                ? "border-date2-violet bg-date2-white shadow-indigoSoft"
                : "border-date2-border bg-date2-white/80 hover:border-date2-lightPeriwinkle hover:bg-date2-white"
            }`}
          >
            <div className="min-w-0">
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.08em] text-date2-deepIndigo sm:block">
                Discover
              </p>
              <p className="truncate text-xs font-bold text-date2-ink sm:text-sm">
                <span className="sm:hidden">Discover</span>
                <span className="hidden sm:inline">Swipe &amp; Match</span>
              </p>
            </div>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-date2-lavenderMist text-xs text-date2-midnight sm:h-8 sm:w-8 sm:rounded-xl sm:text-sm">
              ♥
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              switchTab("chat");
              if (selectedConversationId) {
                handleSelectConversation(selectedConversationId);
              }
            }}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all sm:justify-between sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-left ${
              activeTab === "chat"
                ? "border-date2-violet bg-date2-white shadow-indigoSoft"
                : "border-date2-border bg-date2-white/80 hover:border-date2-lightPeriwinkle hover:bg-date2-white"
            }`}
          >
            <div className="min-w-0">
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.08em] text-date2-deepIndigo sm:block">
                Messages
              </p>
              <p className="truncate text-xs font-bold text-date2-ink sm:text-sm">
                <span className="sm:hidden">Messages</span>
                <span className="hidden sm:inline">
                  {conversations.length} Matches
                  {totalUnread > 0 ? ` · ${totalUnread} unread` : ""}
                </span>
              </p>
            </div>
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg bg-date2-lavenderMist px-1.5 text-[11px] font-bold text-date2-midnight sm:h-8 sm:min-w-8 sm:rounded-xl sm:px-2 sm:text-xs">
              {totalUnread > 0 ? totalUnread : "💬"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("game")}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition-all sm:justify-between sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-left ${
              activeTab === "game"
                ? "border-date2-violet bg-date2-white shadow-indigoSoft"
                : "border-date2-border bg-date2-white/80 hover:border-date2-lightPeriwinkle hover:bg-date2-white"
            }`}
          >
            <div className="min-w-0">
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.08em] text-date2-deepIndigo sm:block">
                Icebreakers
              </p>
              <p className="truncate text-xs font-bold text-date2-ink sm:text-sm">
                <span className="sm:hidden">Games</span>
                <span className="hidden sm:inline">Play Games</span>
              </p>
            </div>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-date2-lavenderMist text-[11px] font-bold text-date2-midnight sm:h-8 sm:w-8 sm:rounded-xl sm:text-xs">
              ★
            </span>
          </button>
        </section>
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
              switchTab("chat");
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
            onRetryMessage={handleRetryMessage}
            onTypingChange={(convId, typing) =>
              socketRef.current?.sendTyping({
                conversationId: convId,
                isTyping: typing,
              })
            }
            onPlayGameWithMatch={(convId) => {
              setSelectedConversationId(convId);
              updateHomeUiState({ selectedConversationId: convId });
              switchTab("game");
            }}
            onToggleVanishMode={handleToggleVanishMode}
            vanishToggling={vanishToggling}
            vanishError={vanishError}
            onStartVideoCall={handleStartVideoCall}
            onSimulateIncomingCall={
              isChatMock
                ? (conv) =>
                    setIncomingCall({
                      callId: `mock-incoming-${Date.now()}`,
                      conversationId: conv.id,
                      callerId: conv.participant.id,
                      callerName: conv.participant.name,
                      callerPhotoUrl: conv.participant.photoUrl,
                    })
                : undefined
            }
            startingCall={startingCall}
            callError={callError}
          />
        </div>

        <div className={activeTab === "game" ? "block" : "hidden"}>
          <GameSection
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={(convId) => {
              setSelectedConversationId(convId);
              updateHomeUiState({ selectedConversationId: convId });
            }}
            onGoToMatch={() => switchTab("match")}
            onReturnToChat={async (convId) => {
              await loadConversations();
              handleSelectConversation(convId);
              switchTab("chat");
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
        className="fixed inset-x-0 bottom-0 z-30 border-t border-date2-border bg-date2-white/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
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
                  switchTab(tab.id);
                  if (tab.id === "chat" && selectedConversationId) {
                    handleSelectConversation(selectedConversationId);
                  }
                }}
                className={`relative flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-date2-midnight text-date2-white"
                    : "text-date2-slate hover:bg-date2-lavenderMist"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-date2-limeMark px-1 text-[10px] font-bold text-date2-midnight">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Incoming Call Consent Modal */}
      <IncomingCallPrompt
        call={incomingCall}
        busy={incomingCallBusy}
        onAccept={handleAcceptIncomingCall}
        onDecline={handleDeclineIncomingCall}
      />

      {/* Active WebRTC Video Call Overlay */}
      {activeCall && (
        <VideoCallOverlay
          call={activeCall}
          chatSocket={socketRef.current}
          incomingSignal={vcSignal}
          onEndCall={handleEndCall}
          onBlockAndEnd={handleBlockAndEnd}
        />
      )}
    </div>
  );
}
