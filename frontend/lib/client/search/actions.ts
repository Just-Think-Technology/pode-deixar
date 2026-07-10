"use server";

import { ApiError } from "@/api/client";
import { refreshAccessToken } from "@/api/auth/refresh-token";
import { searchProfessionals } from "@/api/client/search";
import {
  getAuthSession,
  updateAuthSessionTokens,
} from "@/lib/auth/session.server";
import type {
  SearchProfessionalsPayload,
  SearchProfessionalsResponse,
} from "@/lib/client/search/types";
import { mockSearchProfessionals } from "@/mock/client/search";

export async function searchProfessionalsAction(
  payload: SearchProfessionalsPayload,
): Promise<SearchProfessionalsResponse> {
  const session = await getAuthSession();
  if (!session?.access_token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await searchProfessionals(payload, session.access_token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && session.refresh_token) {
      const refreshed = await refreshAccessToken(session.refresh_token);
      await updateAuthSessionTokens({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        token_type: refreshed.token_type,
      });

      return searchProfessionals(payload, refreshed.access_token);
    }

    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 503)
    ) {
      return mockSearchProfessionals(payload);
    }
    throw err;
  }
}
