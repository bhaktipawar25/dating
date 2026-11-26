import type { AuthMode } from "@/services/auth/types";
import type { DateItineraryItem } from "@/services/ai/types";

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

export interface DatePlanChatPayload {
  planTitle: string;
  vibe: string;
  location: string;
  budget: string;
  schedule: string;
  items: DateItineraryItem[];
}

export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  type?: "text" | "game_result" | "date_plan";
  gameResult?: GameResultChatPayload;
  datePlan?: DatePlanChatPayload;
  isEphemeral?: boolean;
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
  vanishEnabled?: boolean;
  messages?: ChatMessage[];
}

export interface GetConversationsResponse {
  conversations: ChatConversation[];
  currentUserId?: string;
  isMockResponse?: boolean;
}

export interface VanishToggleResponse {
  conversationId: string;
  vanishEnabled: boolean;
  policyDescription?: string;
  message?: string;
  isMockResponse?: boolean;
}

export type VcRequestAction = "initiate" | "accept" | "decline" | "end";

export interface VcRequestPayload {
  action: VcRequestAction;
  callId?: string;
}

export interface VcRequestResponse {
  callId: string;
  conversationId: string;
  status: "ringing" | "accepted" | "declined" | "ended";
  iceServers?: RTCIceServer[];
  message?: string;
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
    }
  | {
      type: "vanish_mode";
      conversationId: string;
      enabled: boolean;
    }
  | {
      type: "vc_incoming";
      conversationId: string;
      callId: string;
      callerId: string;
      callerName: string;
      callerPhotoUrl?: string;
    }
  | {
      type: "vc_signal";
      conversationId: string;
      callId: string;
      signalType: "offer" | "answer" | "ice_candidate" | "ended" | "declined";
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
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
    isEphemeral?: boolean;
    type?: "text" | "date_plan";
    datePlan?: DatePlanChatPayload;
  }) => boolean;
  sendTyping: (payload: {
    conversationId: string;
    isTyping: boolean;
  }) => void;
  sendVcSignal: (payload: {
    conversationId: string;
    callId: string;
    signalType: "offer" | "answer" | "ice_candidate" | "ended" | "declined";
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  }) => boolean;
  markRead: (conversationId: string) => void;
  close: () => void;
}

export interface ChatService {
  readonly mode: AuthMode;
  getConversations(signal?: AbortSignal): Promise<GetConversationsResponse>;
  toggleVanishMode(
    conversationId: string,
    enabled: boolean
  ): Promise<VanishToggleResponse>;
  sendVcRequest(
    conversationId: string,
    payload: VcRequestPayload
  ): Promise<VcRequestResponse>;
  connectStream(handlers: ChatSocketHandlers): ChatSocketConnection;
}
