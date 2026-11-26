export const CHAT_ENDPOINTS = {
  conversations: "/v1/chat/conversations",
  stream: "/v1/chat/stream",
  vanishToggle: (conversationId: string) =>
    `/v1/chat/${encodeURIComponent(conversationId)}/vanish-toggle`,
  vcRequest: (conversationId: string) =>
    `/v1/chat/${encodeURIComponent(conversationId)}/vc-request`,
} as const;
