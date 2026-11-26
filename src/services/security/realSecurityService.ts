import { AUTH_CONFIG } from "@/services/auth/endpoints";
import { authHttpRequest } from "@/services/auth/httpClient";
import { AuthServiceError } from "@/services/auth/types";
import { SECURITY_ENDPOINTS } from "./endpoints";
import {
  SecurityServiceError,
  type DocumentVerifyRequest,
  type DocumentVerifyResponse,
  type FaceScanSubmitRequest,
  type FaceScanSubmitResponse,
  type KycStatusResponse,
  type SecurityService,
} from "./types";

function buildSecurityUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return AUTH_CONFIG.apiBaseUrl
    ? `${AUTH_CONFIG.apiBaseUrl}${normalizedPath}`
    : normalizedPath;
}

/**
 * Ensures sensitive biometric and government ID payloads are only transmitted
 * over HTTPS (allowing localhost / 127.0.0.1 for local development).
 */
function assertSecureTransport(url: string): void {
  if (typeof window === "undefined") return;

  const resolved = new URL(url, window.location.origin);
  const isLocalhost =
    resolved.hostname === "localhost" ||
    resolved.hostname === "127.0.0.1" ||
    resolved.hostname === "[::1]";

  if (resolved.protocol !== "https:" && !isLocalhost) {
    throw new SecurityServiceError(
      "Secure HTTPS connection is required to submit identity verification documents.",
      { status: 0, code: "INSECURE_TRANSPORT" }
    );
  }
}

async function parseMultipartError(
  status: number,
  rawText: string
): Promise<SecurityServiceError> {
  try {
    const parsed = JSON.parse(rawText) as { message?: string; error?: string; code?: string };
    return new SecurityServiceError(
      parsed.message || parsed.error || "Verification submission failed.",
      { status, code: parsed.code ?? `HTTP_${status}` }
    );
  } catch {
    return new SecurityServiceError(
      status === 413
        ? "Uploaded files exceed the server size limit."
        : status === 415
          ? "Unsupported document format."
          : "Unable to complete verification submission. Please try again.",
      { status, code: `HTTP_${status}` }
    );
  }
}

export const realSecurityService: SecurityService = {
  mode: "api",

  async submitFaceScan(
    payload: FaceScanSubmitRequest
  ): Promise<FaceScanSubmitResponse> {
    const targetUrl = buildSecurityUrl(SECURITY_ENDPOINTS.faceScan);
    assertSecureTransport(targetUrl);

    const formData = new FormData();
    formData.append(
      "image",
      payload.imageBlob,
      payload.filename ?? "face-scan.jpg"
    );

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
    } catch {
      throw new SecurityServiceError(
        "Network error while uploading face scan. Check your connection and retry.",
        { status: 0, code: "NETWORK_ERROR" }
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw await parseMultipartError(response.status, text);
    }

    return (await response.json()) as FaceScanSubmitResponse;
  },

  async submitDocumentVerify(
    payload: DocumentVerifyRequest
  ): Promise<DocumentVerifyResponse> {
    const targetUrl = buildSecurityUrl(SECURITY_ENDPOINTS.documentVerify);
    assertSecureTransport(targetUrl);

    const formData = new FormData();
    formData.append("country", payload.country);
    formData.append("documentType", payload.documentType);
    formData.append("frontDocument", payload.frontFile, payload.frontFile.name);
    if (payload.backFile) {
      formData.append("backDocument", payload.backFile, payload.backFile.name);
    }

    return new Promise<DocumentVerifyResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", targetUrl, true);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && payload.onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          payload.onProgress(percent);
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(
              xhr.responseText
            ) as DocumentVerifyResponse;
            resolve(parsed);
          } catch {
            reject(
              new SecurityServiceError(
                "Received an invalid response from the verification server.",
                { status: xhr.status, code: "INVALID_RESPONSE" }
              )
            );
          }
          return;
        }

        reject(await parseMultipartError(xhr.status, xhr.responseText));
      };

      xhr.onerror = () => {
        reject(
          new SecurityServiceError(
            "Network error while uploading verification documents. Please try again.",
            { status: 0, code: "NETWORK_ERROR" }
          )
        );
      };

      xhr.send(formData);
    });
  },

  async getKycStatus(signal?: AbortSignal): Promise<KycStatusResponse> {
    try {
      return await authHttpRequest<KycStatusResponse>(
        SECURITY_ENDPOINTS.kycStatus,
        {
          method: "GET",
          signal,
        }
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      if (err instanceof AuthServiceError) {
        throw new SecurityServiceError(err.message, {
          status: err.status,
          code: err.code,
        });
      }
      throw new SecurityServiceError(
        "Unable to fetch verification status right now.",
        { status: 0, code: "STATUS_FETCH_ERROR" }
      );
    }
  },
};
