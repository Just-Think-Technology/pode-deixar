import type { BrowserContext, Page } from "@playwright/test";

const E2E_ORIGIN = "http://localhost:3100";

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

/** Cookie de sessão mock para área do prestador (NEXT_PUBLIC_USE_MOCK=true). */
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

/** Cookie de sessão mock para área do cliente (NEXT_PUBLIC_USE_MOCK=true). */
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
