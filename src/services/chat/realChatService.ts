import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { authHttpRequest } from "@/services/auth/httpClient";
import { AuthServiceError } from "@/services/auth/types";
import { CHAT_ENDPOINTS } from "./endpoints";
import {
  ChatServiceError,
  type ChatMessage,
  type ChatService,
  type ChatSocketConnection,
  type ChatSocketHandlers,
  type ChatStreamEvent,
  type GetConversationsResponse,
  type VanishToggleResponse,
  type VcRequestPayload,
  type VcRequestResponse,
} from "./types";

function buildChatWebSocketUrl(): string {
  if (AUTH_CONFIG.apiBaseUrl) {
    const base = new URL(AUTH_CONFIG.apiBaseUrl);
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    base.pathname = CHAT_ENDPOINTS.stream;
    return base.toString();
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${CHAT_ENDPOINTS.stream}`;
  }

  return CHAT_ENDPOINTS.stream;
}

function normalizeServerEvent(
  raw: Record<string, unknown>
): ChatStreamEvent | null {
  const eventType = String(raw.type ?? raw.event ?? "").toLowerCase();

  if (eventType === "message" || eventType === "chat.message") {
    const payload = (raw.message ?? raw.payload ?? raw) as ChatMessage;
    if (!payload || !payload.conversationId) return null;
    return { type: "message", message: payload };
  }

  if (eventType === "message_ack" || eventType === "chat.ack") {
    return {
      type: "message_ack",
      clientMessageId: String(raw.clientMessageId ?? ""),
      messageId: String(raw.messageId ?? raw.id ?? ""),
      createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    };
  }

  if (
    eventType === "typing" ||
    eventType === "typing_start" ||
    eventType === "typing_stop" ||
    eventType === "chat.typing"
  ) {
    const isTyping =
      eventType === "typing_start"
        ? true
        : eventType === "typing_stop"
          ? false
          : Boolean(raw.isTyping);
    return {
      type: "typing",
      conversationId: String(raw.conversationId ?? ""),
      userId: String(raw.userId ?? raw.senderId ?? ""),
      userName: raw.userName ? String(raw.userName) : undefined,
      isTyping,
    };
  }

  if (eventType === "read" || eventType === "chat.read") {
    return {
      type: "read",
      conversationId: String(raw.conversationId ?? ""),
    };
  }

  if (eventType === "vanish_mode" || eventType === "chat.vanish_mode") {
    return {
      type: "vanish_mode",
      conversationId: String(raw.conversationId ?? ""),
      enabled: Boolean(raw.enabled ?? raw.vanishEnabled),
    };
  }

  if (eventType === "vc_incoming" || eventType === "chat.vc_incoming") {
    return {
      type: "vc_incoming",
      conversationId: String(raw.conversationId ?? ""),
      callId: String(raw.callId ?? ""),
      callerId: String(raw.callerId ?? ""),
      callerName: String(raw.callerName ?? "Match"),
      callerPhotoUrl: raw.callerPhotoUrl
        ? String(raw.callerPhotoUrl)
        : undefined,
    };
  }

  if (
    eventType === "vc_signal" ||
    eventType === "vc_offer" ||
    eventType === "vc_answer" ||
    eventType === "vc_ice_candidate" ||
    eventType === "vc_ended" ||
    eventType === "vc_declined"
  ) {
    const signalType =
      eventType === "vc_signal"
        ? (String(raw.signalType ?? "ended") as
            | "offer"
            | "answer"
            | "ice_candidate"
            | "ended"
            | "declined")
        : (eventType.replace("vc_", "") as
            | "offer"
            | "answer"
            | "ice_candidate"
            | "ended"
            | "declined");

    return {
      type: "vc_signal",
      conversationId: String(raw.conversationId ?? ""),
      callId: String(raw.callId ?? ""),
      signalType,
      sdp: raw.sdp as RTCSessionDescriptionInit | undefined,
      candidate: raw.candidate as RTCIceCandidateInit | undefined,
    };
  }

  return null;
}

function mapChatError(err: unknown, fallback: string): ChatServiceError {
  if (err instanceof AuthServiceError) {
    return new ChatServiceError(err.message, {
      status: err.status,
      code: err.code,
    });
  }
  return new ChatServiceError(fallback, {
    status: 0,
    code: "CHAT_REQUEST_ERROR",
  });
}

export const realChatService: ChatService = {
  mode: "api",

  async getConversations(
    signal?: AbortSignal
  ): Promise<GetConversationsResponse> {
    try {
      return await authHttpRequest<GetConversationsResponse>(
        CHAT_ENDPOINTS.conversations,
        {
          method: "GET",
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      throw mapChatError(err, "Unable to load conversations right now.");
    }
  },

  async toggleVanishMode(
    conversationId: string,
    enabled: boolean
  ): Promise<VanishToggleResponse> {
    try {
      return await authHttpRequest<VanishToggleResponse>(
        CHAT_ENDPOINTS.vanishToggle(conversationId),
        {
          method: "POST",
          body: { enabled },
        }
      );
    } catch (err) {
      throw mapChatError(
        err,
        "Unable to update Vanish Mode setting right now."
      );
    }
  },

  async sendVcRequest(
    conversationId: string,
    payload: VcRequestPayload
  ): Promise<VcRequestResponse> {
    try {
      return await authHttpRequest<VcRequestResponse>(
        CHAT_ENDPOINTS.vcRequest(conversationId),
        {
          method: "POST",
          body: payload,
        }
      );
    } catch (err) {
      throw mapChatError(err, "Unable to process video call request.");
    }
  },

  connectStream(handlers: ChatSocketHandlers): ChatSocketConnection {
    let socket: WebSocket | null = null;
    let intentionallyClosed = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (intentionallyClosed || typeof WebSocket === "undefined") {
        return;
      }

      handlers.onStatusChange(
        reconnectAttempt > 0 ? "reconnecting" : "connecting"
      );

      try {
        socket = new WebSocket(buildChatWebSocketUrl());
      } catch {
        handlers.onStatusChange("error");
        handlers.onError?.("Unable to open real-time chat connection.");
        return;
      }

      socket.onopen = () => {
        reconnectAttempt = 0;
        handlers.onStatusChange("connected");
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as Record<
            string,
            unknown
          >;
          const normalized = normalizeServerEvent(parsed);
          if (normalized) {
            handlers.onEvent(normalized);
          }
        } catch {
          // Ignore malformed non-JSON frames safely
        }
      };

      socket.onerror = () => {
        handlers.onStatusChange("error");
      };

      socket.onclose = () => {
        if (intentionallyClosed) {
          handlers.onStatusChange("disconnected");
          return;
        }
        handlers.onStatusChange("reconnecting");
        const delayMs = Math.min(15000, 1000 * 2 ** reconnectAttempt);
        reconnectAttempt += 1;
        reconnectTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    const safeSend = (payload: Record<string, unknown>): boolean => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      socket.send(JSON.stringify(payload));
      return true;
    };

    return {
      sendMessage: (payload) =>
        safeSend({
          type: "send_message",
          ...payload,
        }),
      sendTyping: (payload) => {
        safeSend({
          type: payload.isTyping ? "typing_start" : "typing_stop",
          conversationId: payload.conversationId,
        });
      },
      sendVcSignal: (payload) =>
        safeSend({
          type: "vc_signal",
          ...payload,
        }),
      markRead: (conversationId) => {
        safeSend({
          type: "mark_read",
          conversationId,
        });
      },
      close: () => {
        intentionallyClosed = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        socket?.close();
        socket = null;
        handlers.onStatusChange("disconnected");
      },
    };
  },
};
