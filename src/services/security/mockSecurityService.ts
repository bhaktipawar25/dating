import { AUTH_CONFIG } from "@/services/auth/endpoints";
import type { DocumentTypeId } from "@/lib/security/countries";
import type {
  DocumentVerifyRequest,
  DocumentVerifyResponse,
  FaceScanSubmitRequest,
  FaceScanSubmitResponse,
  KycOverallStatus,
  KycStatusResponse,
  SecurityService,
  StepVerificationStatus,
} from "./types";

interface MockKycState {
  faceScanStatus: StepVerificationStatus;
  faceScanSubmittedAt?: string;
  documentStatus: StepVerificationStatus;
  documentCountry?: string;
  documentType?: DocumentTypeId;
  documentSubmittedAt?: string;
  updatedAt?: string;
}

const DEV_KYC_STORAGE_KEY = "date2_dev_mock_kyc_status";

const globalForMockKyc = globalThis as typeof globalThis & {
  __date2MockKycState?: MockKycState;
};

export function isDevMockSimulationAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" && AUTH_CONFIG.mode === "mock"
  );
}

function readPersistedDevKycState(): MockKycState {
  if (globalForMockKyc.__date2MockKycState) {
    return globalForMockKyc.__date2MockKycState;
  }

  const initial: MockKycState = {
    faceScanStatus: "NOT_STARTED",
    documentStatus: "NOT_STARTED",
  };

  if (typeof window !== "undefined" && isDevMockSimulationAllowed()) {
    try {
      const raw = window.sessionStorage.getItem(DEV_KYC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MockKycState>;
        if (parsed.faceScanStatus) {
          initial.faceScanStatus = parsed.faceScanStatus;
        }
        if (parsed.documentStatus) {
          initial.documentStatus = parsed.documentStatus;
        }
        initial.faceScanSubmittedAt = parsed.faceScanSubmittedAt;
        initial.documentCountry = parsed.documentCountry;
        initial.documentType = parsed.documentType;
        initial.documentSubmittedAt = parsed.documentSubmittedAt;
        initial.updatedAt = parsed.updatedAt;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  globalForMockKyc.__date2MockKycState = initial;
  return initial;
}

function writePersistedDevKycState(state: MockKycState): void {
  globalForMockKyc.__date2MockKycState = state;
  if (typeof window !== "undefined" && isDevMockSimulationAllowed()) {
    try {
      // Stores only non-sensitive status metadata (never images or tokens)
      window.sessionStorage.setItem(DEV_KYC_STORAGE_KEY, JSON.stringify(state));
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

function deriveOverallStatus(state: MockKycState): KycOverallStatus {
  if (
    state.faceScanStatus === "FAILED" ||
    state.documentStatus === "FAILED"
  ) {
    return "VERIFICATION_FAILED";
  }
  if (
    state.faceScanStatus === "VERIFIED" &&
    state.documentStatus === "VERIFIED"
  ) {
    return "VERIFIED";
  }
  if (
    state.faceScanStatus === "SUBMITTED" &&
    state.documentStatus === "SUBMITTED"
  ) {
    return "VERIFICATION_PENDING";
  }
  if (state.documentStatus === "SUBMITTED") {
    return "DOCUMENT_SUBMITTED";
  }
  if (state.faceScanStatus === "SUBMITTED") {
    return "FACE_SCAN_SUBMITTED";
  }
  return "NOT_STARTED";
}

function buildStatusResponse(state: MockKycState): KycStatusResponse {
  return {
    overallStatus: deriveOverallStatus(state),
    faceScan: {
      status: state.faceScanStatus,
      submittedAt: state.faceScanSubmittedAt,
      message:
        state.faceScanStatus === "VERIFIED"
          ? "Face scan verified (development test simulation)."
          : state.faceScanStatus === "SUBMITTED"
            ? "Face scan submitted and awaiting backend verification."
            : "No face scan submitted yet.",
    },
    documentVerification: {
      status: state.documentStatus,
      country: state.documentCountry,
      documentType: state.documentType,
      submittedAt: state.documentSubmittedAt,
      message:
        state.documentStatus === "VERIFIED"
          ? "Identity document verified (development test simulation)."
          : state.documentStatus === "SUBMITTED"
            ? "Identity document submitted and awaiting backend review."
            : "No identity document submitted yet.",
    },
    updatedAt: state.updatedAt,
    isMockResponse: true,
  };
}

/**
 * Development-only simulation helper used on /security-check/status when
 * running without a live KYC backend. Never active in production or API mode.
 */
export async function simulateMockBackendKycApproval(): Promise<KycStatusResponse> {
  if (!isDevMockSimulationAllowed()) {
    throw new Error(
      "Simulated verification approval is disabled in production and live API mode."
    );
  }

  await delay(200);
  const current = readPersistedDevKycState();
  const now = new Date().toISOString();

  const updated: MockKycState = {
    ...current,
    faceScanStatus: "VERIFIED",
    documentStatus: "VERIFIED",
    faceScanSubmittedAt: current.faceScanSubmittedAt ?? now,
    documentSubmittedAt: current.documentSubmittedAt ?? now,
    updatedAt: now,
  };

  writePersistedDevKycState(updated);
  return buildStatusResponse(updated);
}

/**
 * In-memory mock KYC status metadata for frontend UI testing when the backend
 * is unavailable. Never stores image/document binary data and never claims
 * frontend-only face recognition or government ID verification succeeded.
 */
export const mockSecurityService: SecurityService = {
  mode: "mock",

  async submitFaceScan(
    payload: FaceScanSubmitRequest
  ): Promise<FaceScanSubmitResponse> {
    if (!payload.imageBlob || payload.imageBlob.size === 0) {
      throw new Error("Captured image is empty.");
    }

    await delay(500);
    const current = readPersistedDevKycState();
    const now = new Date().toISOString();

    const updated: MockKycState = {
      ...current,
      faceScanStatus: "SUBMITTED",
      faceScanSubmittedAt: now,
      updatedAt: now,
    };
    writePersistedDevKycState(updated);

    return {
      status: "SUBMITTED",
      overallStatus: deriveOverallStatus(updated),
      submissionId: "mock-face-submission",
      submittedAt: now,
      isMockResponse: true,
      message:
        "Face capture recorded in local UI test mode. Actual liveness and facial verification require the backend service.",
    };
  },

  async submitDocumentVerify(
    payload: DocumentVerifyRequest
  ): Promise<DocumentVerifyResponse> {
    payload.onProgress?.(20);
    await delay(180);
    payload.onProgress?.(60);
    await delay(200);
    payload.onProgress?.(100);
    await delay(140);

    const current = readPersistedDevKycState();
    const now = new Date().toISOString();

    const updated: MockKycState = {
      ...current,
      documentStatus: "SUBMITTED",
      documentCountry: payload.country,
      documentType: payload.documentType,
      documentSubmittedAt: now,
      updatedAt: now,
    };
    writePersistedDevKycState(updated);

    return {
      status: "SUBMITTED",
      overallStatus: deriveOverallStatus(updated),
      submissionId: "mock-doc-submission",
      submittedAt: now,
      isMockResponse: true,
      message:
        "Document submission recorded in local UI test mode. Actual government ID verification requires the backend service.",
    };
  },

  async getKycStatus(signal?: AbortSignal): Promise<KycStatusResponse> {
    await delay(180, signal);
    const current = readPersistedDevKycState();
    return buildStatusResponse(current);
  },
};
