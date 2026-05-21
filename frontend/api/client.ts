const baseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL;

export function getApiBaseUrl(): string {
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL não está definida no .env",
    );
  }
  return baseUrl;
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
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
          : "Erro na requisição";
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
