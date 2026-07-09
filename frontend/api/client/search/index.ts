import { apiFetch, apiFetchAuth } from "@/api/client";
import { mockSearchProfessionals } from "@/mock/client/search";
import type {
  ProviderSearchResult,
  SearchProfessionalsPayload,
  SearchProfessionalsResponse,
} from "@/lib/client/search/types";

export type { SearchProfessionalsPayload, SearchProfessionalsResponse };

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * GET /providers/search?q=&categoryId=
 *
 * @param accessToken - Opcional. Quando o backend exigir autenticação, passar o token do cliente.
 */
export async function searchProfessionals(
  payload: SearchProfessionalsPayload,
  accessToken?: string,
): Promise<SearchProfessionalsResponse> {
  if (USE_MOCK) {
    return mockSearchProfessionals(payload);
  }

  const params = new URLSearchParams();
  if (payload.query) params.set("q", payload.query);
  if (payload.categoryId) params.set("categoryId", payload.categoryId);
  if (payload.page != null) params.set("page", String(payload.page));
  if (payload.limit != null) params.set("limit", String(payload.limit));

  const qs = params.toString();
  const path = `/providers/search${qs ? `?${qs}` : ""}`;

  const data = accessToken
    ? await apiFetchAuth<ProviderSearchResult[]>(path, accessToken)
    : await apiFetch<ProviderSearchResult[]>(path);

  return {
    professionals: data,
    total: data.length,
  };
}