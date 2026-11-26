import { AUTH_CONFIG } from "@/services/auth/endpoints";
import type {
  GetInterestsResponse,
  InterestCategory,
  PersonalInfoPayload,
  PersonalInfoResponse,
  ProfileService,
} from "./types";

const MOCK_INTEREST_CATEGORIES: InterestCategory[] = [
  {
    id: "music",
    name: "Music",
    tags: [
      { id: "pop-music", label: "Pop Music", categoryId: "music" },
      { id: "classical-music", label: "Classical Music", categoryId: "music" },
      { id: "hip-hop", label: "Hip-Hop", categoryId: "music" },
      { id: "rock-music", label: "Rock Music", categoryId: "music" },
      { id: "singing", label: "Singing", categoryId: "music" },
      {
        id: "playing-instruments",
        label: "Playing Instruments",
        categoryId: "music",
      },
    ],
  },
  {
    id: "travel",
    name: "Travel",
    tags: [
      { id: "travelling", label: "Travelling", categoryId: "travel" },
      { id: "adventure", label: "Adventure", categoryId: "travel" },
      { id: "road-trips", label: "Road Trips", categoryId: "travel" },
      { id: "beaches", label: "Beaches", categoryId: "travel" },
      { id: "mountains", label: "Mountains", categoryId: "travel" },
      {
        id: "exploring-new-places",
        label: "Exploring New Places",
        categoryId: "travel",
      },
    ],
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    tags: [
      { id: "fitness", label: "Fitness", categoryId: "lifestyle" },
      { id: "yoga", label: "Yoga", categoryId: "lifestyle" },
      { id: "cooking", label: "Cooking", categoryId: "lifestyle" },
      { id: "shopping", label: "Shopping", categoryId: "lifestyle" },
      { id: "fashion", label: "Fashion", categoryId: "lifestyle" },
      { id: "meditation", label: "Meditation", categoryId: "lifestyle" },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    tags: [
      { id: "movies", label: "Movies", categoryId: "entertainment" },
      { id: "web-series", label: "Web Series", categoryId: "entertainment" },
      { id: "photography", label: "Photography", categoryId: "entertainment" },
      { id: "gaming", label: "Gaming", categoryId: "entertainment" },
      { id: "reading", label: "Reading", categoryId: "entertainment" },
      { id: "dancing", label: "Dancing", categoryId: "entertainment" },
    ],
  },
  {
    id: "sports",
    name: "Sports",
    tags: [
      { id: "cricket", label: "Cricket", categoryId: "sports" },
      { id: "football", label: "Football", categoryId: "sports" },
      { id: "badminton", label: "Badminton", categoryId: "sports" },
      { id: "swimming", label: "Swimming", categoryId: "sports" },
      { id: "cycling", label: "Cycling", categoryId: "sports" },
      { id: "basketball", label: "Basketball", categoryId: "sports" },
    ],
  },
  {
    id: "food",
    name: "Food",
    tags: [
      { id: "coffee", label: "Coffee", categoryId: "food" },
      { id: "street-food", label: "Street Food", categoryId: "food" },
      { id: "baking", label: "Baking", categoryId: "food" },
      {
        id: "trying-new-restaurants",
        label: "Trying New Restaurants",
        categoryId: "food",
      },
    ],
  },
];

const DEV_PROFILE_STORAGE_KEY = "date2_dev_mock_personal_info";

const globalForMockProfile = globalThis as typeof globalThis & {
  __date2SavedMockPersonalInfo?: PersonalInfoResponse | null;
};

function isDevMockMode(): boolean {
  return process.env.NODE_ENV !== "production" && AUTH_CONFIG.mode === "mock";
}

function readSavedMockPersonalInfo(): PersonalInfoResponse | null {
  if (globalForMockProfile.__date2SavedMockPersonalInfo) {
    return globalForMockProfile.__date2SavedMockPersonalInfo;
  }
  if (typeof window !== "undefined" && isDevMockMode()) {
    try {
      const raw = window.sessionStorage.getItem(DEV_PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersonalInfoResponse;
        globalForMockProfile.__date2SavedMockPersonalInfo = parsed;
        return parsed;
      }
    } catch {
      // Ignore storage access errors
    }
  }
  return null;
}

function writeSavedMockPersonalInfo(record: PersonalInfoResponse): void {
  globalForMockProfile.__date2SavedMockPersonalInfo = record;
  if (typeof window !== "undefined" && isDevMockMode()) {
    try {
      window.sessionStorage.setItem(
        DEV_PROFILE_STORAGE_KEY,
        JSON.stringify(record)
      );
    } catch {
      // Ignore storage access errors
    }
  }
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
 * Isolated in-memory mock profile service for UI testing when the backend
 * server is not running. Does not persist data to a real database.
 */
export const mockProfileService: ProfileService = {
  mode: "mock",

  async getInterests(signal?: AbortSignal): Promise<GetInterestsResponse> {
    await delay(220, signal);
    return {
      categories: MOCK_INTEREST_CATEGORIES,
      isMockResponse: true,
    };
  },

  async savePersonalInfo(
    payload: PersonalInfoPayload
  ): Promise<PersonalInfoResponse> {
    await delay(420);
    const completed = Boolean(
      payload.completeOnboarding &&
        payload.sex &&
        payload.interestedIn.length > 0 &&
        payload.interests.length > 0
    );

    const existing = readSavedMockPersonalInfo();
    const record: PersonalInfoResponse = {
      message: completed
        ? "Personal information recorded in local UI test mode. Connect the backend to persist to the database."
        : "Preferences saved in local UI test mode.",
      profileCompleted: completed || Boolean(existing?.profileCompleted),
      personalInfo: {
        ...payload,
        interestedIn: [...payload.interestedIn],
        interests: [...payload.interests],
        visibility: { ...payload.visibility },
      },
      updatedAt: new Date().toISOString(),
      isMockResponse: true,
    };

    writeSavedMockPersonalInfo(record);
    return record;
  },

  async getPersonalInfo(
    signal?: AbortSignal
  ): Promise<PersonalInfoResponse | null> {
    await delay(140, signal);
    return readSavedMockPersonalInfo();
  },
};
