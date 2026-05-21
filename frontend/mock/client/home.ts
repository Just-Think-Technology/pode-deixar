import type { MockProfessional, ServiceCategory } from "@/mock/types";

export const CLIENT_CATEGORY_ALL = "Todos";

export const CLIENT_SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: "limpeza", label: "Limpeza" },
  { id: "pintura", label: "Pintura" },
  { id: "eletrica", label: "Elétrica" },
  { id: "construcao", label: "Construção" },
  { id: "jardinagem", label: "Jardinagem" },
  { id: "automotivo", label: "Automotivo" },
];

export const CLIENT_MOCK_PROFESSIONALS: MockProfessional[] = [
  {
    id: "1",
    providerName: "João Silva",
    title: "Pintura residencial e comercial",
    description:
      "Profissional com mais de 10 anos de experiência em pintura de interiores e exteriores. Trabalho com tintas de alta qualidade e acabamento impecável.",
    category: "Pintura",
    location: "São Paulo, SP",
    rating: 4.8,
    reviewCount: 124,
    coverImageUrl:
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
  },
  {
    id: "2",
    providerName: "Maria Santos",
    title: "Limpeza residencial e comercial",
    description:
      "Serviços de limpeza profunda, organização e higienização. Equipe treinada e produtos eco-friendly.",
    category: "Limpeza",
    location: "São Paulo, SP",
    rating: 4.9,
    reviewCount: 156,
    coverImageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
  },
  {
    id: "3",
    providerName: "Carlos Oliveira",
    title: "Instalações elétricas",
    description:
      "Eletricista certificado para instalações, manutenção e reparos. Atendimento rápido e seguro.",
    category: "Elétrica",
    location: "São Paulo, SP",
    rating: 4.7,
    reviewCount: 89,
    coverImageUrl:
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80",
  },
  {
    id: "4",
    providerName: "Ana Costa",
    title: "Construção e reformas",
    description:
      "Reformas completas, construção civil e acabamentos. Orçamento detalhado e prazos cumpridos.",
    category: "Construção",
    location: "São Paulo, SP",
    rating: 4.8,
    reviewCount: 203,
    coverImageUrl:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
  },
  {
    id: "5",
    providerName: "Pedro Lima",
    title: "Jardinagem e paisagismo",
    description:
      "Manutenção de jardins, poda, paisagismo e irrigação. Transformo seu espaço verde.",
    category: "Jardinagem",
    location: "São Paulo, SP",
    rating: 4.6,
    reviewCount: 67,
    coverImageUrl:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
  },
  {
    id: "6",
    providerName: "Roberto Silva",
    title: "Serviços automotivos",
    description:
      "Mecânica, estética automotiva e revisões. Atendimento em domicílio ou oficina parceira.",
    category: "Automotivo",
    location: "São Paulo, SP",
    rating: 4.9,
    reviewCount: 142,
    coverImageUrl:
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80",
    avatarImageUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&q=80",
  },
];
