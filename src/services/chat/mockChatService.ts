import type {
  ChatConversation,
  ChatMessage,
  ChatService,
  ChatSocketConnection,
  ChatSocketHandlers,
  GameResultChatPayload,
  GetConversationsResponse,
} from "./types";

const MOCK_CURRENT_USER_ID = "current-user";

const initialConversations: ChatConversation[] = [
  {
    id: "conv-1",
    participant: {
      id: "match-1",
      name: "Riya",
      age: 25,
      location: "Bengaluru",
      interests: ["Coffee", "Travelling", "Photography"],
    },
    lastMessage: "Have you tried any of the new indie cafes this week?",
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    unreadCount: 1,
    messages: [
      {
        id: "msg-101",
        conversationId: "conv-1",
        senderId: "match-1",
        senderName: "Riya",
        content: "Hey! Saw we both have Coffee and Photography on our profiles.",
        createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        status: "sent",
      },
      {
        id: "msg-102",
        conversationId: "conv-1",
        senderId: MOCK_CURRENT_USER_ID,
        content: "Hi Riya! Yes, always hunting for good espresso and street shots.",
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        status: "sent",
      },
      {
        id: "msg-103",
        conversationId: "conv-1",
        senderId: "match-1",
        senderName: "Riya",
        content: "Have you tried any of the new indie cafes this week?",
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        status: "sent",
      },
    ],
  },
];

const globalForMockChat = globalThis as typeof globalThis & {
  __date2MockConversations?: ChatConversation[];
  __date2MockChatListeners?: Set<(event: Parameters<ChatSocketHandlers["onEvent"]>[0]) => void>;
};

function getConversationStore(): ChatConversation[] {
  if (!globalForMockChat.__date2MockConversations) {
    globalForMockChat.__date2MockConversations = initialConversations.map(
      (c) => ({
        ...c,
        messages: c.messages ? [...c.messages] : [],
      })
    );
  }
  return globalForMockChat.__date2MockConversations;
}

function getListeners(): Set<
  (event: Parameters<ChatSocketHandlers["onEvent"]>[0]) => void
> {
  if (!globalForMockChat.__date2MockChatListeners) {
    globalForMockChat.__date2MockChatListeners = new Set();
  }
  return globalForMockChat.__date2MockChatListeners;
}

export function addMockConversationFromMatch(input: {
  participantId: string;
  name: string;
  age?: number;
  location?: string;
  interests?: string[];
}): ChatConversation {
  const store = getConversationStore();
  const existing = store.find(
    (c) => c.participant.id === input.participantId
  );
  if (existing) {
    return existing;
  }

  const created: ChatConversation = {
    id: `conv-${input.participantId}`,
    participant: {
      id: input.participantId,
      name: input.name,
      age: input.age,
      location: input.location,
      interests: input.interests,
    },
    lastMessage: "You matched! Say hello or start a game.",
    lastMessageAt: new Date().toISOString(),
    unreadCount: 0,
    messages: [],
  };

  store.unshift(created);
  return created;
}

export function postMockGameResultToChat(
  conversationId: string,
  result: GameResultChatPayload
): ChatMessage {
  const store = getConversationStore();
  const target =
    store.find((c) => c.id === conversationId) ?? store[0];

  const message: ChatMessage = {
    id: `msg-game-${Date.now()}`,
    conversationId: target.id,
    senderId: MOCK_CURRENT_USER_ID,
    content: `${result.gameName}: ${result.summary}`,
    type: "game_result",
    gameResult: result,
    createdAt: new Date().toISOString(),
    status: "sent",
  };

  target.messages = [...(target.messages ?? []), message];
  target.lastMessage = `${result.gameName} result shared`;
  target.lastMessageAt = message.createdAt;

  for (const listener of getListeners()) {
    listener({ type: "message", message });
  }

  return message;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Isolated mock chat service for local frontend UI testing when the backend
 * chat API and WebSocket server are unavailable.
 */
export const mockChatService: ChatService = {
  mode: "mock",

  async getConversations(
    signal?: AbortSignal
  ): Promise<GetConversationsResponse> {
    await delay(200, signal);
    const store = getConversationStore();
    return {
      conversations: store.map((c) => ({
        ...c,
        messages: c.messages ? [...c.messages] : [],
      })),
      currentUserId: MOCK_CURRENT_USER_ID,
      isMockResponse: true,
    };
  },

  connectStream(handlers: ChatSocketHandlers): ChatSocketConnection {
    const listeners = getListeners();
    listeners.add(handlers.onEvent);

    const timers: ReturnType<typeof setTimeout>[] = [];
    let closed = false;

    handlers.onStatusChange("connecting");
    const openTimer = setTimeout(() => {
      if (!closed) {
        handlers.onStatusChange("connected");
      }
    }, 180);
    timers.push(openTimer);

    return {
      sendMessage: ({ conversationId, content, clientMessageId }) => {
        if (closed) return false;
        const store = getConversationStore();
        const conversation = store.find((c) => c.id === conversationId);
        if (!conversation) return false;

        const now = new Date().toISOString();
        const serverId = `msg-${Date.now()}`;
        const saved: ChatMessage = {
          id: serverId,
          clientMessageId,
          conversationId,
          senderId: MOCK_CURRENT_USER_ID,
          content,
          type: "text",
          createdAt: now,
          status: "sent",
        };
        conversation.messages = [...(conversation.messages ?? []), saved];
        conversation.lastMessage = content;
        conversation.lastMessageAt = now;

        const ackTimer = setTimeout(() => {
          if (closed) return;
          handlers.onEvent({
            type: "message_ack",
            clientMessageId,
            messageId: serverId,
            createdAt: now,
          });
        }, 160);
        timers.push(ackTimer);

        // Simulate partner typing indicator + reply in mock test mode
        const typingStartTimer = setTimeout(() => {
          if (closed) return;
          handlers.onEvent({
            type: "typing",
            conversationId,
            userId: conversation.participant.id,
            userName: conversation.participant.name,
            isTyping: true,
          });
        }, 550);
        timers.push(typingStartTimer);

        const replyTimer = setTimeout(() => {
          if (closed) return;
          handlers.onEvent({
            type: "typing",
            conversationId,
            userId: conversation.participant.id,
            userName: conversation.participant.name,
            isTyping: false,
          });

          const replyTime = new Date().toISOString();
          const replyMsg: ChatMessage = {
            id: `msg-reply-${Date.now()}`,
            conversationId,
            senderId: conversation.participant.id,
            senderName: conversation.participant.name,
            content: `Thanks for messaging! (Simulated reply in local test mode)`,
            type: "text",
            createdAt: replyTime,
            status: "sent",
          };
          conversation.messages = [...(conversation.messages ?? []), replyMsg];
          conversation.lastMessage = replyMsg.content;
          conversation.lastMessageAt = replyTime;

          handlers.onEvent({ type: "message", message: replyMsg });
        }, 1800);
        timers.push(replyTimer);

        return true;
      },

      sendTyping: () => {
        // No-op in mock mode
      },

      markRead: (conversationId) => {
        const store = getConversationStore();
        const conversation = store.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
        handlers.onEvent({ type: "read", conversationId });
      },

      close: () => {
        closed = true;
        timers.forEach(clearTimeout);
        listeners.delete(handlers.onEvent);
        handlers.onStatusChange("disconnected");
      },
    };
  },
};
