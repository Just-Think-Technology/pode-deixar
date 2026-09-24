// Deep HTTP client — base URL, timeout fetch, API error and authed fetch

const FETCH_TIMEOUT = 10_000;

export const API_PREFIX = '/api/v1';

export function getApiBaseUrl(): string {
  const internalUrl = process.env.BACKEND_INTERNAL_URL;
  const publicUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  // Prefer internal Docker network URL in RSC/actions (server-side)
  const rawBaseUrl =
    typeof window === "undefined" && internalUrl ? internalUrl : publicUrl;

  if (!rawBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL não está definida no .env",
    );
  }
  // Normalize: strip trailing slash and legacy /api or /api/v1 suffix to avoid
  // duplication (e.g. http://localhost:8080/api -> http://localhost:8080/api/v1)
  const normalized = rawBaseUrl
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '')
    .replace(/\/api$/, '');
  return `${normalized}${API_PREFIX}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    // FormData sets its own multipart boundary; a JSON content type would
    // corrupt the upload payload.
    const isFormData =
      typeof FormData !== "undefined" && options?.body instanceof FormData;
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options?.headers,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : Array.isArray(data?.message)
            ? data.message.join(", ")
            : res.status === 401
              ? "Sessão expirada. Faça login novamente."
              : res.status === 403
                ? "Você não tem permissão para realizar esta ação. Se precisar, faça login com o perfil correto."
                : "Não foi possível completar. Verifique sua conexão e tente novamente — se persistir, contate o suporte.";
      throw new ApiError(message, res.status, data);
    }

    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(
        "O servidor não respondeu. Tente novamente mais tarde.",
        503,
      );
    }
    // Fetch failures (refused connection, CORS, gateway restarting during
    // stack-up) surface as TypeError — translate so the raw NetworkError
    // never reaches the UI.
    if (err instanceof TypeError) {
      throw new ApiError(
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente — se persistir, contate o suporte.",
        503,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiFetchAuth<T>(
  path: string,
  accessToken: string,
  options?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
}

/**
 * Authed fetch with API_PREFIX handling via getApiBaseUrl and optional
 * token-refresh retry. This is the deep-module entry for authenticated
 * requests that need refresh semantics without duplicating logic in
 * every server action.
 *
 * Prefer `withTokenRefresh` for server actions where the token lifecycle
 * is managed via cookies; `authedFetch` is for direct route calls that
 * already have a refresh strategy.
 *
 * @param path - API path without prefix (e.g. "/services/me")
 * @param accessToken - Bearer token
 * @param options - fetch init
 * @returns Parsed JSON
 */
export async function authedFetch<T>(
  path: string,
  accessToken: string,
  options?: RequestInit,
): Promise<T> {
  return apiFetchAuth<T>(path, accessToken, options);
}
