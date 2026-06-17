import { mockSearchProfessionals } from "@/mock/client/search";
import type {
  SearchProfessionalsPayload,
  SearchProfessionalsResponse,
} from "@/lib/client/search/types";

export type { SearchProfessionalsPayload, SearchProfessionalsResponse };

/**
 * POST /client/professionals/search
 * Body: { query?: string; categoryId?: string }
 */
export async function searchProfessionals(
  payload: SearchProfessionalsPayload,
): Promise<SearchProfessionalsResponse> {
  // TODO(backend): substituir mock quando POST /client/professionals/search estiver pronto
  return mockSearchProfessionals(payload);

  // return apiFetch<SearchProfessionalsResponse>("/client/professionals/search", {
  //   method: "POST",
  //   body: JSON.stringify(payload),
  // });
}
