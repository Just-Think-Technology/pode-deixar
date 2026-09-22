// Provider reviews mocks — seeded review lists for profile display

import type { RawProviderReview } from "@/lib/client/reviews/types";

const MOCK_REVIEWS_BY_PROVIDER: Record<string, RawProviderReview[]> = {
  u1: [
    {
      id: "r1",
      rating: 5,
      comment: "Prestador muito profissional, pontual e cuidadoso.",
      created_at: "2026-09-12T10:00:00.000Z",
      reviewer: {
        display_name: "Carlos Mendes",
        avatar_url:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
      },
    },
    {
      id: "r2",
      rating: 5,
      comment: "Serviço impecável, superou as expectativas.",
      created_at: "2026-09-08T14:30:00.000Z",
      reviewer: {
        display_name: "Ana Paula",
        avatar_url: null,
      },
    },
    {
      id: "r3",
      rating: 4,
      comment: "Bom trabalho, pequeno atraso no início mas compensou no acabamento.",
      created_at: "2026-09-02T09:15:00.000Z",
      reviewer: {
        display_name: "Roberto Alves",
        avatar_url: null,
      },
    },
    {
      id: "r4",
      rating: 5,
      comment: null,
      created_at: "2026-08-28T16:45:00.000Z",
      reviewer: {
        display_name: "Fernanda Lima",
        avatar_url:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
      },
    },
    {
      id: "r5",
      rating: 5,
      comment: "Preço justo e execução rápida. Recomendo.",
      created_at: "2026-08-20T11:00:00.000Z",
      reviewer: { display_name: "Paulo Henrique", avatar_url: null },
    },
    {
      id: "r6",
      rating: 4,
      comment: null,
      created_at: "2026-08-15T13:20:00.000Z",
      reviewer: { display_name: "Juliana Castro", avatar_url: null },
    },
    {
      id: "r7",
      rating: 5,
      comment: "Deixou tudo limpo após o serviço. Muito caprichoso.",
      created_at: "2026-08-10T10:05:00.000Z",
      reviewer: { display_name: "Marcos Vinícius", avatar_url: null },
    },
    {
      id: "r8",
      rating: 5,
      comment: "Segunda vez que contrato e novamente excelente.",
      created_at: "2026-08-02T15:40:00.000Z",
      reviewer: { display_name: "Patrícia Gomes", avatar_url: null },
    },
    {
      id: "r9",
      rating: 3,
      comment: "Trabalho razoável, comunicação poderia ser melhor.",
      created_at: "2026-07-25T09:00:00.000Z",
      reviewer: { display_name: "Diego Ferreira", avatar_url: null },
    },
    {
      id: "r10",
      rating: 5,
      comment: null,
      created_at: "2026-07-18T12:30:00.000Z",
      reviewer: { display_name: "Camila Rocha", avatar_url: null },
    },
    {
      id: "r11",
      rating: 5,
      comment: "Orçamento claro desde o início, sem surpresas.",
      created_at: "2026-07-10T08:20:00.000Z",
      reviewer: { display_name: "Thiago Oliveira", avatar_url: null },
    },
    {
      id: "r12",
      rating: 4,
      comment: "Bom custo-benefício.",
      created_at: "2026-07-01T17:10:00.000Z",
      reviewer: { display_name: "Larissa Martins", avatar_url: null },
    },
  ],
  u2: [
    {
      id: "r20",
      rating: 5,
      comment: "Profissional excelente, muito atenciosa aos detalhes.",
      created_at: "2026-09-11T10:00:00.000Z",
      reviewer: { display_name: "Ricardo Souza", avatar_url: null },
    },
    {
      id: "r21",
      rating: 5,
      comment: null,
      created_at: "2026-09-05T14:00:00.000Z",
      reviewer: { display_name: "Beatriz Cardoso", avatar_url: null },
    },
  ],
};

export function mockGetProviderReviews(
  providerUserId: string,
  limit: number,
): RawProviderReview[] {
  return (MOCK_REVIEWS_BY_PROVIDER[providerUserId] ?? []).slice(0, limit);
}
