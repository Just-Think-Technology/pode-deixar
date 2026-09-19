// E2E auth helpers — session cookies for worker and client areas
// Mock helpers remain for `E2E_USE_MOCK=true`; real helpers use the backend API.

import type { BrowserContext, Page } from "@playwright/test";

const E2E_ORIGIN = "http://localhost:3100";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080/api";

const MOCK_WORKER_SESSION = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 86_400,
  token_type: "Bearer",
  user: {
    id: "mock-provider-id",
    complete_name: "Prestador Mock",
    email: "prestador@mock.local",
    role: "PROVIDER" as const,
  },
};

const MOCK_CLIENT_SESSION = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 86_400,
  token_type: "Bearer",
  user: {
    id: "mock-client-id",
    complete_name: "Cliente Mock",
    email: "cliente@mock.local",
    role: "CLIENT" as const,
  },
};

// Mock session cookie for the worker area (E2E_USE_MOCK=true).
export async function loginAsWorkerMock(
  page: Page,
  context: BrowserContext = page.context(),
) {
  await context.addCookies([
    {
      name: "auth_session",
      value: JSON.stringify(MOCK_WORKER_SESSION),
      url: E2E_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

// Mock session cookie for the client area (E2E_USE_MOCK=true).
export async function loginAsClientMock(
  page: Page,
  context: BrowserContext = page.context(),
) {
  await context.addCookies([
    {
      name: "auth_session",
      value: JSON.stringify(MOCK_CLIENT_SESSION),
      url: E2E_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

// --- Real backend helpers (default) ---

async function loginViaBackend(
  email: string,
  password: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function loginAsWorker(
  page: Page,
  context: BrowserContext = page.context(),
) {
  if (process.env.E2E_USE_MOCK === "true") {
    return loginAsWorkerMock(page, context);
  }
  const email = process.env.E2E_WORKER_EMAIL ?? "prestador.e2e@pode-deixar.local";
  const password = process.env.E2E_WORKER_PASSWORD ?? "Test123!@#";
  const data = await loginViaBackend(email, password);
  await context.addCookies([
    {
      name: "auth_session",
      value: JSON.stringify(data),
      url: E2E_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function loginAsClient(
  page: Page,
  context: BrowserContext = page.context(),
) {
  if (process.env.E2E_USE_MOCK === "true") {
    return loginAsClientMock(page, context);
  }
  const email = process.env.E2E_CLIENT_EMAIL ?? "cliente.e2e@pode-deixar.local";
  const password = process.env.E2E_CLIENT_PASSWORD ?? "Test123!@#";
  const data = await loginViaBackend(email, password);
  await context.addCookies([
    {
      name: "auth_session",
      value: JSON.stringify(data),
      url: E2E_ORIGIN,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
