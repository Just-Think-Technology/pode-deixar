import { apiFetchAuth, ApiError } from "@/api/client";
import { mockSearchProfessionals } from "@/mock/client/search";
import type {
  ProviderSearchResult,
  SearchProfessionalsPayload,
  SearchProfessionalsResponse,
} from "@/lib/client/search/types";

export type { SearchProfessionalsPayload, SearchProfessionalsResponse };

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type SearchProvidersApiResponse = {
  data: ProviderSearchResult[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

function normalizeSearchResponse(
  response: SearchProvidersApiResponse | ProviderSearchResult[],
): SearchProfessionalsResponse {
  if (Array.isArray(response)) {
    return {
      professionals: response,
      total: response.length,
    };
  }

  return {
    professionals: response.data,
    total: response.meta.total,
    page: response.meta.page,
    limit: response.meta.limit,
    totalPages: response.meta.totalPages,
  };
}

/**
 * GET /providers/search?q=&categoryId=
 */
export async function searchProfessionals(
  payload: SearchProfessionalsPayload,
  accessToken: string,
): Promise<SearchProfessionalsResponse> {
  if (USE_MOCK) {
    return mockSearchProfessionals(payload);
  }

  if (!accessToken) {
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }

  const params = new URLSearchParams();
  if (payload.query) params.set("q", payload.query);
  if (payload.categoryId) params.set("categoryId", payload.categoryId);
  if (payload.page != null) params.set("page", String(payload.page));
  if (payload.limit != null) params.set("limit", String(payload.limit));

  const qs = params.toString();
  const path = `/providers/search${qs ? `?${qs}` : ""}`;

  const response = await apiFetchAuth<SearchProvidersApiResponse | ProviderSearchResult[]>(
    path,
    accessToken,
  );

  return normalizeSearchResponse(response);
}
