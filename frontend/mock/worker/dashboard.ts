import type { MonthlyServiceData, StatMetric } from "@/mock/types";

export const WORKER_DASHBOARD_STATS: StatMetric[] = [
  { title: "Total de Serviços", value: "74", subtitle: "+12% este mês", trend: "up" },
  { title: "Solicitações", value: "28", subtitle: "+8% este mês", trend: "up" },
  { title: "Avaliação Média", value: "4.8", subtitle: "124 avaliações" },
  { title: "Receita Mensal", value: "R$ 12.450", subtitle: "+15% este mês", trend: "up" },
];

export const WORKER_MONTHLY_SERVICES: MonthlyServiceData[] = [
  { month: "Jan", total: 7 },
  { month: "Fev", total: 14 },
  { month: "Mar", total: 21 },
  { month: "Abr", total: 28 },
];
