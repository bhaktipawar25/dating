import { AUTH_CONFIG, AUTH_ENDPOINTS } from "./endpoints";
import { AuthServiceError, type AuthFieldErrors } from "./types";

export interface HttpRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the 401 refresh retry (used for login or refresh requests themselves). */
  skipAuthRefresh?: boolean;
}

interface BackendErrorPayload {
  message?: string;
  error?: string;
  code?: string;
  fieldErrors?: AuthFieldErrors;
  errors?: AuthFieldErrors;
}

let inflightRefresh: Promise<boolean> | null = null;

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return AUTH_CONFIG.apiBaseUrl
    ? `${AUTH_CONFIG.apiBaseUrl}${normalizedPath}`
    : normalizedPath;
}

/**
 * Coordinates a single-flight HTTP-only cookie refresh call when the backend
 * exposes a refresh endpoint, preventing parallel 401 refresh races.
 */
async function attemptSessionRefresh(): Promise<boolean> {
  if (!AUTH_ENDPOINTS.refreshSession) {
    return false;
  }

  if (!inflightRefresh) {
    inflightRefresh = (async () => {
      try {
        const res = await fetch(buildUrl(AUTH_ENDPOINTS.refreshSession), {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        inflightRefresh = null;
      }
    })();
  }

  return inflightRefresh;
}

async function parseErrorResponse(res: Response): Promise<AuthServiceError> {
  let payload: BackendErrorPayload | null = null;

  try {
    payload = (await res.json()) as BackendErrorPayload;
  } catch {
    payload = null;
  }

  const message =
    payload?.message ||
    payload?.error ||
    (res.status === 401
      ? "Invalid credentials or your session has expired."
      : res.status === 429
        ? "Too many attempts. Please wait a moment and try again."
        : "Unable to complete the request. Please try again.");

  return new AuthServiceError(message, {
    status: res.status,
    code: payload?.code ?? `HTTP_${res.status}`,
    fieldErrors: payload?.fieldErrors ?? payload?.errors,
  });
}

/**
 * Shared fetch client configured for HTTP-only cookie sessions.
 * Never reads or writes sensitive tokens in localStorage or sessionStorage.
 */
export async function authHttpRequest<T>(
  path: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const { body, headers, skipAuthRefresh = false, ...rest } = options;

  const execute = () =>
    fetch(buildUrl(path), {
      ...rest,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response: Response;
  try {
    response = await execute();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    throw new AuthServiceError(
      "Network error: unable to reach the authentication server.",
      { status: 0, code: "NETWORK_ERROR" }
    );
  }

  if (response.status === 401 && !skipAuthRefresh) {
    const refreshed = await attemptSessionRefresh();
    if (refreshed) {
      response = await execute();
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
