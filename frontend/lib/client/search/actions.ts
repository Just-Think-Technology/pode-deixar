// Client search actions — professional search server actions

"use server";

import { ApiError } from "@/api/client/http";
import { withTokenRefresh } from "@/api/client/with-token-refresh";
import { searchProfessionals } from "@/api/client/search";
import type {
  SearchProfessionalsPayload,
  SearchProfessionalsResponse,
} from "@/lib/client/search/types";
import { mockSearchProfessionals } from "@/mock/client/search";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function searchProfessionalsAction(
  payload: SearchProfessionalsPayload,
): Promise<SearchProfessionalsResponse> {
  try {
    return await withTokenRefresh((token) => searchProfessionals(payload, token));
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 501 || err.status === 503)
    ) {
      if (!USE_MOCK) throw err;
      return mockSearchProfessionals(payload);
    }
    throw err;
  }
}
