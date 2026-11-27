"use client";

/**
 * Safe, centralized Local Storage utilities for Date².
 *
 * SECURITY BOUNDARY:
 * Never store passwords, authentication tokens/cookies/session secrets,
 * government ID files/references, facial images/biometrics, sensitive personal
 * info (sex/discovery preferences), Vanish Mode messages, or private chat history.
 */

export const STORAGE_KEYS = {
  /** Non-sensitive app-wide UI preferences preserved across logout. */
  UI_PREFERENCES: "date2.ui.preferences.v1",
  /** User-scoped navigation/layout state cleared on logout. */
  HOME_STATE: "date2.user.home_state.v1",
  /** Temporary unsent non-Vanish chat drafts cleared on logout. */
  CHAT_DRAFTS: "date2.user.chat_drafts.v1",
  /** Non-sensitive security screen step progress indicators cleared on logout. */
  SECURITY_PROGRESS: "date2.user.security_progress.v1",
} as const;

export const USER_SCOPED_STORAGE_KEYS = [
  STORAGE_KEYS.HOME_STATE,
  STORAGE_KEYS.CHAT_DRAFTS,
  STORAGE_KEYS.SECURITY_PROGRESS,
] as const;

export interface Date2UiPreferences {
  authSafetyInfoExpanded: boolean;
  showPasswordChecklist: boolean;
  homeOverviewCompact: boolean;
  matchDetailsExpanded: boolean;
}

export const DEFAULT_UI_PREFERENCES: Date2UiPreferences = {
  authSafetyInfoExpanded: false,
  showPasswordChecklist: true,
  homeOverviewCompact: false,
  matchDetailsExpanded: false,
};

export type DashboardTabKey = "match" | "chat" | "game";

export interface HomeUiState {
  activeTab: DashboardTabKey;
  selectedConversationId: string | null;
  aiPanelOpen: boolean;
}

export const DEFAULT_HOME_UI_STATE: HomeUiState = {
  activeTab: "match",
  selectedConversationId: null,
  aiPanelOpen: false,
};

export type SecurityStepKey =
  | "overview"
  | "face-scan"
  | "document-verification"
  | "status";

export interface SecurityProgressState {
  lastVisitedStep: SecurityStepKey;
  visitedSteps: SecurityStepKey[];
  faceChecklistReviewed: boolean;
  privacyNoticeExpanded: boolean;
  stagesReferenceExpanded: boolean;
}

export const DEFAULT_SECURITY_PROGRESS: SecurityProgressState = {
  lastVisitedStep: "overview",
  visitedSteps: [],
  faceChecklistReviewed: false,
  privacyNoticeExpanded: true,
  stagesReferenceExpanded: false,
};

export interface ChatDraftEntry {
  text: string;
  updatedAt: number;
}

export type ChatDraftMap = Record<string, ChatDraftEntry>;

const MAX_DRAFT_LENGTH = 2000;
const MAX_STORED_DRAFTS = 20;

const memoryFallbackStore = new Map<string, string>();
const localKeyListeners = new Map<string, Set<() => void>>();

function notifyLocalListeners(key: string): void {
  const listeners = localKeyListeners.get(key);
  if (!listeners) return;
  for (const cb of Array.from(listeners)) {
    try {
      cb();
    } catch {
      // Ignore individual subscriber errors
    }
  }
}

function getBrowserLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    const probeKey = "__date2_storage_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

function isQuotaExceededError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const domErr = err as { name?: string; code?: number };
  return (
    domErr.name === "QuotaExceededError" ||
    domErr.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    domErr.code === 22 ||
    domErr.code === 1014
  );
}

function safeReadRaw(key: string): string | null {
  const storage = getBrowserLocalStorage();
  if (!storage) {
    return memoryFallbackStore.get(key) ?? null;
  }
  try {
    return storage.getItem(key);
  } catch {
    return memoryFallbackStore.get(key) ?? null;
  }
}

function safeWriteRaw(key: string, value: string): boolean {
  memoryFallbackStore.set(key, value);
  const storage = getBrowserLocalStorage();
  if (!storage) {
    notifyLocalListeners(key);
    return false;
  }

  try {
    storage.setItem(key, value);
    notifyLocalListeners(key);
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      // Evict temporary chat drafts first to reclaim space cleanly
      if (key !== STORAGE_KEYS.CHAT_DRAFTS) {
        try {
          storage.removeItem(STORAGE_KEYS.CHAT_DRAFTS);
          memoryFallbackStore.delete(STORAGE_KEYS.CHAT_DRAFTS);
          storage.setItem(key, value);
          notifyLocalListeners(key);
          return true;
        } catch {
          // Fall through silently to in-memory fallback
        }
      }
    }
    notifyLocalListeners(key);
    return false;
  }
}

function safeRemoveRaw(key: string): void {
  memoryFallbackStore.delete(key);
  const storage = getBrowserLocalStorage();
  if (storage) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage access restrictions
    }
  }
  notifyLocalListeners(key);
}

function safeReadValidated<T>(
  key: string,
  validate: (parsed: unknown) => T | null,
  fallback: T
): T {
  const raw = safeReadRaw(key);
  if (!raw) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    const validated = validate(parsed);
    if (validated === null) {
      safeRemoveRaw(key);
      return fallback;
    }
    return validated;
  } catch {
    // Heal malformed JSON safely
    safeRemoveRaw(key);
    return fallback;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateUiPreferences(raw: unknown): Date2UiPreferences | null {
  if (!isPlainObject(raw)) return null;
  return {
    authSafetyInfoExpanded:
      typeof raw.authSafetyInfoExpanded === "boolean"
        ? raw.authSafetyInfoExpanded
        : DEFAULT_UI_PREFERENCES.authSafetyInfoExpanded,
    showPasswordChecklist:
      typeof raw.showPasswordChecklist === "boolean"
        ? raw.showPasswordChecklist
        : DEFAULT_UI_PREFERENCES.showPasswordChecklist,
    homeOverviewCompact:
      typeof raw.homeOverviewCompact === "boolean"
        ? raw.homeOverviewCompact
        : DEFAULT_UI_PREFERENCES.homeOverviewCompact,
    matchDetailsExpanded:
      typeof raw.matchDetailsExpanded === "boolean"
        ? raw.matchDetailsExpanded
        : DEFAULT_UI_PREFERENCES.matchDetailsExpanded,
  };
}

function validateHomeUiState(raw: unknown): HomeUiState | null {
  if (!isPlainObject(raw)) return null;
  const activeTab: DashboardTabKey =
    raw.activeTab === "match" ||
    raw.activeTab === "chat" ||
    raw.activeTab === "game"
      ? raw.activeTab
      : DEFAULT_HOME_UI_STATE.activeTab;

  const selectedConversationId =
    typeof raw.selectedConversationId === "string" &&
    raw.selectedConversationId.trim().length > 0 &&
    raw.selectedConversationId.length <= 128
      ? raw.selectedConversationId
      : null;

  return {
    activeTab,
    selectedConversationId,
    aiPanelOpen:
      typeof raw.aiPanelOpen === "boolean"
        ? raw.aiPanelOpen
        : DEFAULT_HOME_UI_STATE.aiPanelOpen,
  };
}

function isSecurityStepKey(value: unknown): value is SecurityStepKey {
  return (
    value === "overview" ||
    value === "face-scan" ||
    value === "document-verification" ||
    value === "status"
  );
}

function validateSecurityProgress(raw: unknown): SecurityProgressState | null {
  if (!isPlainObject(raw)) return null;
  const lastVisitedStep = isSecurityStepKey(raw.lastVisitedStep)
    ? raw.lastVisitedStep
    : DEFAULT_SECURITY_PROGRESS.lastVisitedStep;

  const visitedSet = new Set<SecurityStepKey>();
  if (Array.isArray(raw.visitedSteps)) {
    for (const item of raw.visitedSteps) {
      if (isSecurityStepKey(item)) {
        visitedSet.add(item);
      }
    }
  }

  return {
    lastVisitedStep,
    visitedSteps: Array.from(visitedSet),
    faceChecklistReviewed:
      typeof raw.faceChecklistReviewed === "boolean"
        ? raw.faceChecklistReviewed
        : DEFAULT_SECURITY_PROGRESS.faceChecklistReviewed,
    privacyNoticeExpanded:
      typeof raw.privacyNoticeExpanded === "boolean"
        ? raw.privacyNoticeExpanded
        : DEFAULT_SECURITY_PROGRESS.privacyNoticeExpanded,
    stagesReferenceExpanded:
      typeof raw.stagesReferenceExpanded === "boolean"
        ? raw.stagesReferenceExpanded
        : DEFAULT_SECURITY_PROGRESS.stagesReferenceExpanded,
  };
}

function validateChatDrafts(raw: unknown): ChatDraftMap | null {
  if (!isPlainObject(raw)) return null;
  const clean: ChatDraftMap = {};

  const entries = Object.entries(raw).filter(
    ([convId, entry]) =>
      typeof convId === "string" &&
      convId.trim().length > 0 &&
      convId.length <= 128 &&
      isPlainObject(entry) &&
      typeof entry.text === "string" &&
      entry.text.trim().length > 0
  );

  entries
    .sort(([, a], [, b]) => {
      const timeA = isPlainObject(a) && typeof a.updatedAt === "number" ? a.updatedAt : 0;
      const timeB = isPlainObject(b) && typeof b.updatedAt === "number" ? b.updatedAt : 0;
      return timeB - timeA;
    })
    .slice(0, MAX_STORED_DRAFTS)
    .forEach(([convId, entry]) => {
      if (isPlainObject(entry) && typeof entry.text === "string") {
        clean[convId] = {
          text: entry.text.slice(0, MAX_DRAFT_LENGTH),
          updatedAt:
            typeof entry.updatedAt === "number" && Number.isFinite(entry.updatedAt)
              ? entry.updatedAt
              : Date.now(),
        };
      }
    });

  return clean;
}

/** App-wide non-sensitive UI preferences */
export function getUiPreferences(): Date2UiPreferences {
  return safeReadValidated(
    STORAGE_KEYS.UI_PREFERENCES,
    validateUiPreferences,
    DEFAULT_UI_PREFERENCES
  );
}

export function updateUiPreferences(
  patch: Partial<Date2UiPreferences>
): Date2UiPreferences {
  const next: Date2UiPreferences = {
    ...getUiPreferences(),
    ...patch,
  };
  safeWriteRaw(STORAGE_KEYS.UI_PREFERENCES, JSON.stringify(next));
  return next;
}

/** Feature 4 user-scoped dashboard state (cleared on logout) */
export function getHomeUiState(): HomeUiState {
  return safeReadValidated(
    STORAGE_KEYS.HOME_STATE,
    validateHomeUiState,
    DEFAULT_HOME_UI_STATE
  );
}

export function updateHomeUiState(patch: Partial<HomeUiState>): HomeUiState {
  const next: HomeUiState = {
    ...getHomeUiState(),
    ...patch,
  };
  safeWriteRaw(STORAGE_KEYS.HOME_STATE, JSON.stringify(next));
  return next;
}

/** Feature 2 non-sensitive verification screen indicators (cleared on logout) */
export function getSecurityProgress(): SecurityProgressState {
  return safeReadValidated(
    STORAGE_KEYS.SECURITY_PROGRESS,
    validateSecurityProgress,
    DEFAULT_SECURITY_PROGRESS
  );
}

export function updateSecurityProgress(
  patch: Partial<SecurityProgressState>
): SecurityProgressState {
  const current = getSecurityProgress();
  const visitedSet = new Set<SecurityStepKey>([
    ...current.visitedSteps,
    ...(patch.visitedSteps ?? []),
    ...(patch.lastVisitedStep ? [patch.lastVisitedStep] : []),
  ]);

  const next: SecurityProgressState = {
    ...current,
    ...patch,
    visitedSteps: Array.from(visitedSet),
  };
  safeWriteRaw(STORAGE_KEYS.SECURITY_PROGRESS, JSON.stringify(next));
  return next;
}

/** Feature 4 temporary unsent non-Vanish chat drafts (cleared on logout) */
export function getAllChatDrafts(): ChatDraftMap {
  return safeReadValidated(
    STORAGE_KEYS.CHAT_DRAFTS,
    validateChatDrafts,
    {}
  );
}

export function getChatDraft(conversationId: string): string {
  if (!conversationId) return "";
  const drafts = getAllChatDrafts();
  return drafts[conversationId]?.text ?? "";
}

export function setChatDraft(conversationId: string, text: string): void {
  if (!conversationId) return;
  const drafts = getAllChatDrafts();

  if (!text.trim()) {
    if (conversationId in drafts) {
      delete drafts[conversationId];
      if (Object.keys(drafts).length === 0) {
        safeRemoveRaw(STORAGE_KEYS.CHAT_DRAFTS);
      } else {
        safeWriteRaw(STORAGE_KEYS.CHAT_DRAFTS, JSON.stringify(drafts));
      }
    }
    return;
  }

  drafts[conversationId] = {
    text: text.slice(0, MAX_DRAFT_LENGTH),
    updatedAt: Date.now(),
  };

  // Prune to MAX_STORED_DRAFTS most recent entries before serializing
  const pruned = validateChatDrafts(drafts) ?? {};
  safeWriteRaw(STORAGE_KEYS.CHAT_DRAFTS, JSON.stringify(pruned));
}

export function removeChatDraft(conversationId: string): void {
  if (!conversationId) return;
  const drafts = getAllChatDrafts();
  if (!(conversationId in drafts)) return;
  delete drafts[conversationId];
  if (Object.keys(drafts).length === 0) {
    safeRemoveRaw(STORAGE_KEYS.CHAT_DRAFTS);
  } else {
    safeWriteRaw(STORAGE_KEYS.CHAT_DRAFTS, JSON.stringify(drafts));
  }
}

/**
 * Clears all user-specific temporary state and drafts on logout,
 * while deliberately preserving general UI preferences.
 */
export function clearUserScopedStorage(): void {
  for (const key of USER_SCOPED_STORAGE_KEYS) {
    safeRemoveRaw(key);
  }
}

/**
 * Subscribes to both cross-tab `window.storage` changes and same-tab writes
 * for a given Date² storage key.
 */
export function subscribeToStorageKey(
  key: string,
  callback: () => void
): () => void {
  let set = localKeyListeners.get(key);
  if (!set) {
    set = new Set();
    localKeyListeners.set(key, set);
  }
  set.add(callback);

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === null || event.key === key) {
      try {
        callback();
      } catch {
        // Ignore handler error
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }

  return () => {
    localKeyListeners.get(key)?.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}
