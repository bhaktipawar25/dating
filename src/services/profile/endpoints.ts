export const PROFILE_ENDPOINTS = {
  interests: "/v1/profile/interests",
  personalInfo: "/v1/profile/personal-info",
  /** Optional GET endpoint if backend exposes saved personal info preload. */
  getPersonalInfo:
    process.env.NEXT_PUBLIC_PROFILE_GET_ENDPOINT?.trim() ?? "",
} as const;
