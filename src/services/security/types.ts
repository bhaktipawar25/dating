import type { AuthMode } from "@/services/auth/types";
import type { DocumentTypeId } from "@/lib/security/countries";

export type KycOverallStatus =
  | "NOT_STARTED"
  | "CAMERA_PERMISSION_REQUIRED"
  | "FACE_SCAN_SUBMITTED"
  | "DOCUMENT_SUBMITTED"
  | "VERIFICATION_PENDING"
  | "VERIFIED"
  | "VERIFICATION_FAILED";

export type StepVerificationStatus =
  | "NOT_STARTED"
  | "SUBMITTED"
  | "PENDING"
  | "VERIFIED"
  | "FAILED";

export interface FaceScanSubmitRequest {
  imageBlob: Blob;
  filename?: string;
}

export interface FaceScanSubmitResponse {
  status: StepVerificationStatus;
  overallStatus: KycOverallStatus;
  submissionId?: string;
  message: string;
  submittedAt?: string;
  isMockResponse?: boolean;
}

export interface DocumentVerifyRequest {
  country: string;
  documentType: DocumentTypeId;
  frontFile: File;
  backFile?: File | null;
  onProgress?: (percent: number) => void;
}

export interface DocumentVerifyResponse {
  status: StepVerificationStatus;
  overallStatus: KycOverallStatus;
  submissionId?: string;
  message: string;
  submittedAt?: string;
  isMockResponse?: boolean;
}

export interface KycStatusResponse {
  overallStatus: KycOverallStatus;
  faceScan: {
    status: StepVerificationStatus;
    submittedAt?: string;
    message?: string;
  };
  documentVerification: {
    status: StepVerificationStatus;
    country?: string;
    documentType?: DocumentTypeId;
    submittedAt?: string;
    message?: string;
  };
  failureReason?: string;
  updatedAt?: string;
  isMockResponse?: boolean;
}

export class SecurityServiceError extends Error {
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
    this.name = "SecurityServiceError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "SECURITY_ERROR";
  }
}

export interface SecurityService {
  readonly mode: AuthMode;
  submitFaceScan(
    payload: FaceScanSubmitRequest
  ): Promise<FaceScanSubmitResponse>;
  submitDocumentVerify(
    payload: DocumentVerifyRequest
  ): Promise<DocumentVerifyResponse>;
  getKycStatus(signal?: AbortSignal): Promise<KycStatusResponse>;
}
