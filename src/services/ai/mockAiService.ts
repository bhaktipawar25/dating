import type {
  AiChatSuggestRequest,
  AiChatSuggestResponse,
  AiService,
  DatePlannerRequest,
  DatePlannerResponse,
} from "./types";

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
 * Isolated mock AI service for UI testing when the backend AI endpoints
 * are unavailable. Clearly distinguishes simulated responses from live AI.
 */
export const mockAiService: AiService = {
  mode: "mock",

  async suggestChat(
    payload: AiChatSuggestRequest,
    signal?: AbortSignal
  ): Promise<AiChatSuggestResponse> {
    await delay(480, signal);
    const name = payload.matchProfile.name || "there";
    const firstInterest = payload.matchProfile.interests?.[0] ?? "music";
    const secondInterest = payload.matchProfile.interests?.[1] ?? "travel";

    if (payload.mode === "icebreakers") {
      return {
        isMockResponse: true,
        suggestions: [
          {
            id: `ice-1-${Date.now()}`,
            category: "Shared Interest",
            text: `Hey ${name}! I noticed ${firstInterest} on your profile — what's been your favourite moment with it lately?`,
          },
          {
            id: `ice-2-${Date.now()}`,
            category: "Light & Curious",
            text: `If we planned a spontaneous weekend around ${secondInterest}, what's the very first stop you'd pick?`,
          },
          {
            id: `ice-3-${Date.now()}`,
            category: "Playful Opener",
            text: `Quick question ${name}: are you more of a slow morning coffee person or an evening street-food explorer?`,
          },
        ],
      };
    }

    const lastMessage =
      payload.recentMessages?.[payload.recentMessages.length - 1]?.content ??
      "";
    const hasTopic = lastMessage.length > 0;

    return {
      isMockResponse: true,
      suggestions: [
        {
          id: `rep-1-${Date.now()}`,
          category: "Friendly Reply",
          text: hasTopic
            ? `That sounds great! I'd love to hear your go-to recommendation — we should compare favourites soon.`
            : `Hey ${name}! How has your week been going so far?`,
        },
        {
          id: `rep-2-${Date.now()}`,
          category: "Interesting Follow-up",
          text: `Count me in for that! What got you into ${firstInterest} in the first place?`,
        },
        {
          id: `rep-3-${Date.now()}`,
          category: "Keep It Moving",
          text: `Funny you mention that — I was just thinking about planning something around ${secondInterest} this weekend.`,
        },
      ],
    };
  },

  async generateDatePlan(
    payload: DatePlannerRequest,
    signal?: AbortSignal
  ): Promise<DatePlannerResponse> {
    await delay(560, signal);
    const city = payload.location.trim() || "City Center";
    const vibe = payload.vibe || "Casual";
    const startTime = payload.time || "18:00";

    return {
      isMockResponse: true,
      planTitle: `${vibe} Date Plan in ${city}`,
      items: [
        {
          id: `plan-1-${Date.now()}`,
          activityName:
            vibe === "Adventure"
              ? "Golden-Hour Scenic Walk & Lookout"
              : "Artisan Coffee & Warm-Up Chat",
          location: `${city} Arts District`,
          suggestedTime: `${payload.date} · ${startTime}`,
          description: `Easy-going arrival spot with a relaxed ${vibe.toLowerCase()} pace so you can talk comfortably.`,
          estimatedBudget: payload.budget || "Moderate",
        },
        {
          id: `plan-2-${Date.now()}`,
          activityName:
            vibe === "Food & Dining"
              ? "Chef's Tasting Table"
              : "Dinner & Acoustic Patio",
          location: `Central ${city}`,
          suggestedTime: `${payload.date} · +1 hr`,
          description:
            "Cozy seating and shareable plates tailored to your selected budget and vibe.",
          estimatedBudget: payload.budget || "Moderate",
        },
        {
          id: `plan-3-${Date.now()}`,
          activityName: "Evening Dessert & Stroll",
          location: `${city} Promenade`,
          suggestedTime: `${payload.date} · +2.5 hrs`,
          description:
            "Optional dessert stop and an unhurried walk to wrap up the evening.",
          estimatedBudget: "Included in budget",
        },
      ],
    };
  },
};
