export type SexOptionId = "MALE" | "FEMALE" | "TRANS" | "OTHERS";

export type DiscoveryPreferenceId = "MEN" | "WOMEN" | "TRANS" | "OTHERS";

export interface SexOptionConfig {
  id: SexOptionId;
  label: string;
}

export interface DiscoveryPreferenceOption {
  id: DiscoveryPreferenceId;
  label: string;
  description: string;
}

export interface ProfileVisibilitySettings {
  showInDiscovery: boolean;
  showSexOnProfile: boolean;
  showInterestsOnProfile: boolean;
}

export interface ProfileVisibilityOptionConfig {
  key: keyof ProfileVisibilitySettings;
  label: string;
  description: string;
  /** Marked true for frontend-configurable fields pending final backend contract confirmation. */
  pendingBackendConfirmation: boolean;
}

/** Exactly the four specified sex selection options. */
export const SEX_OPTIONS: readonly SexOptionConfig[] = [
  { id: "MALE", label: "Male" },
  { id: "FEMALE", label: "Female" },
  { id: "TRANS", label: "Trans" },
  { id: "OTHERS", label: "Others" },
] as const;

export const DISCOVERY_PREFERENCE_OPTIONS: readonly DiscoveryPreferenceOption[] =
  [
    {
      id: "MEN",
      label: "Men",
      description: "Show profiles of men in your discovery feed.",
    },
    {
      id: "WOMEN",
      label: "Women",
      description: "Show profiles of women in your discovery feed.",
    },
    {
      id: "TRANS",
      label: "Trans",
      description: "Show profiles of transgender members in discovery.",
    },
    {
      id: "OTHERS",
      label: "Others",
      description: "Show profiles of members who identify as Others.",
    },
  ] as const;

/**
 * Configurable profile visibility controls. Update keys here if the backend
 * personal-info schema introduces different visibility field names.
 */
export const PROFILE_VISIBILITY_OPTIONS: readonly ProfileVisibilityOptionConfig[] =
  [
    {
      key: "showInDiscovery",
      label: "Show my profile in discovery",
      description:
        "Allow eligible Date² members to see your profile card in discovery.",
      pendingBackendConfirmation: true,
    },
    {
      key: "showSexOnProfile",
      label: "Display my sex on profile",
      description:
        "Show your selected option publicly on your profile preview.",
      pendingBackendConfirmation: true,
    },
    {
      key: "showInterestsOnProfile",
      label: "Display my interests on profile",
      description:
        "Share your selected interest tags so matches can see shared hobbies.",
      pendingBackendConfirmation: true,
    },
  ] as const;

export const DEFAULT_VISIBILITY_SETTINGS: ProfileVisibilitySettings = {
  showInDiscovery: true,
  showSexOnProfile: true,
  showInterestsOnProfile: true,
};
