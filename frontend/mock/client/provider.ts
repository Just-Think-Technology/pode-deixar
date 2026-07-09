import type { ProviderPublicProfile } from "@/lib/client/provider/types";

export const MOCK_PROVIDER_PROFILES: ProviderPublicProfile[] = [
  {
    id: "1",
    user: {
      id: "u1",
      complete_name: "João Silva",
      email: "joao.silva@example.com",
      phone: "+5511999999999",
      postal_code: "01234-567",
    },
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    bio: "Profissional com mais de 10 anos de experiência em pintura de interiores e exteriores. Trabalho com tintas de alta qualidade e acabamento impecável. Atendimento rápido e orçamento sem compromisso.\n\nEspecialidades:\n- Pintura residencial e comercial\n- Texturização e efeitos decorativos\n- Restauração de móveis\n- Impermeabilização",
    hourly_rate: 85.0,
    skills: ["Pintura residencial", "Pintura comercial", "Acabamento", "Restauração"],
    rating: 4.8,
    total_reviews: 124,
    is_available: true,
    services: [
      {
        id: "s1",
        title: "Pintura de paredes internas",
        description:
          "Pintura completa de paredes com tinta acrílica de alta qualidade. Inclui preparação da superfície, aplicação de selador e duas demãos de tinta.",
        fixed_price: 200.0,
        category_id: "pintura",
        category: { id: "pintura", name: "Pintura", slug: "pintura" },
      },
      {
        id: "s2",
        title: "Pintura de fachada externa",
        description:
          "Pintura externa completa com tinta texturizada. Inclui limpeza prévia, reparos em trincas e aplicação de impermeabilizante.",
        fixed_price: 800.0,
        category_id: "pintura",
        category: { id: "pintura", name: "Pintura", slug: "pintura" },
      },
    ],
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-06-28T10:00:00.000Z",
  },
  {
    id: "2",
    user: {
      id: "u2",
      complete_name: "Maria Santos",
      email: "maria.santos@example.com",
      phone: "+5511988888888",
      postal_code: "04567-890",
    },
    avatar_url:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    bio: "Serviços de limpeza profunda, organização e higienização. Equipe treinada e produtos eco-friendly. Realizo limpeza pós-obra, limpeza comercial e residencial com alto padrão de qualidade.",
    hourly_rate: 60.0,
    skills: ["Limpeza residencial", "Limpeza comercial", "Higienização", "Organização"],
    rating: 4.9,
    total_reviews: 156,
    is_available: true,
    services: [
      {
        id: "s3",
        title: "Limpeza completa residencial",
        description:
          "Limpeza profunda de toda a residência com produtos eco-friendly. Inclui quartos, salas, cozinha, banheiros e áreas externas.",
        fixed_price: 150.0,
        category_id: "limpeza",
        category: { id: "limpeza", name: "Limpeza", slug: "limpeza" },
      },
      {
        id: "s4",
        title: "Limpeza pós-obra",
        description:
          "Limpeza pesada após reforma ou construção. Remoção de resíduos, poeira fina e acabamento impecável.",
        fixed_price: 500.0,
        category_id: "limpeza",
        category: { id: "limpeza", name: "Limpeza", slug: "limpeza" },
      },
    ],
    created_at: "2026-02-20T10:00:00.000Z",
    updated_at: "2026-06-28T10:00:00.000Z",
  },
  {
    id: "3",
    user: {
      id: "u3",
      complete_name: "Carlos Oliveira",
      email: "carlos.oliveira@example.com",
      phone: "+5511977777777",
      postal_code: "05678-901",
    },
    avatar_url:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    bio: "Eletricista certificado para instalações, manutenção e reparos. Atendimento rápido e seguro com garantia de 90 dias em todos os serviços.",
    hourly_rate: 95.0,
    skills: ["Instalações elétricas", "Manutenção", "Reparos", "Automação"],
    rating: 4.7,
    total_reviews: 89,
    is_available: true,
    services: [
      {
        id: "s5",
        title: "Instalação de chuveiro elétrico",
        description: "Instalação completa com garantia de 90 dias. Inclui troca de fiação se necessário.",
        fixed_price: 150.0,
        category_id: "eletrica",
        category: { id: "eletrica", name: "Elétrica", slug: "eletrica" },
      },
    ],
    created_at: "2026-03-10T10:00:00.000Z",
    updated_at: "2026-06-28T10:00:00.000Z",
  },
];

export function mockGetProviderPublicProfile(
  providerId: string,
): Promise<ProviderPublicProfile> {
  const profile = MOCK_PROVIDER_PROFILES.find((p) => p.id === providerId);

  if (!profile) {
    return Promise.reject({
      message: "Perfil não encontrado",
      status: 404,
    });
  }

  return Promise.resolve(profile);
}
