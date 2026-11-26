import type { AuthMode } from "@/services/auth/types";

export type ChatConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type ChatMessageDeliveryStatus = "sending" | "sent" | "failed";

export interface GameResultChatPayload {
  gameId: "trivia" | "two_truths_lie" | "compatibility_quiz";
  gameName: string;
  summary: string;
  scoreLabel?: string;
}

export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  type?: "text" | "game_result";
  gameResult?: GameResultChatPayload;
  createdAt?: string;
  status?: ChatMessageDeliveryStatus;
}

export interface ChatParticipant {
  id: string;
  name: string;
  photoUrl?: string;
  age?: number;
  location?: string;
  interests?: string[];
}

export interface ChatConversation {
  id: string;
  participant: ChatParticipant;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  messages?: ChatMessage[];
}

export interface GetConversationsResponse {
  conversations: ChatConversation[];
  currentUserId?: string;
  isMockResponse?: boolean;
}

export type ChatStreamEvent =
  | {
      type: "message";
      message: ChatMessage;
    }
  | {
      type: "message_ack";
      clientMessageId: string;
      messageId: string;
      createdAt?: string;
    }
  | {
      type: "typing";
      conversationId: string;
      userId: string;
      userName?: string;
      isTyping: boolean;
    }
  | {
      type: "read";
      conversationId: string;
    };

export class ChatServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
    }
  ) {
    super(message);
    this.name = "ChatServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "CHAT_ERROR";
  }
}

export interface ChatSocketHandlers {
  onStatusChange: (status: ChatConnectionStatus) => void;
  onEvent: (event: ChatStreamEvent) => void;
  onError?: (message: string) => void;
}

export interface ChatSocketConnection {
  sendMessage: (payload: {
    conversationId: string;
    content: string;
    clientMessageId: string;
  }) => boolean;
  sendTyping: (payload: {
    conversationId: string;
    isTyping: boolean;
  }) => void;
  markRead: (conversationId: string) => void;
  close: () => void;
}

export interface ChatService {
  readonly mode: AuthMode;
  getConversations(signal?: AbortSignal): Promise<GetConversationsResponse>;
  connectStream(handlers: ChatSocketHandlers): ChatSocketConnection;
}
