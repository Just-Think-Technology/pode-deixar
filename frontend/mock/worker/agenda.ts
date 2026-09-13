// Worker agenda mocks — seeded events with generated photos

import { addMonths, format } from "date-fns";

import type {
  WorkerAgendaAddress,
  WorkerAgendaEvent,
  WorkerAgendaRange,
} from "@/lib/worker/agenda/types";

const SAO_PAULO_ADDRESS: WorkerAgendaAddress = {
  street: "Rua Augusta",
  number: "1500",
  neighborhood: "Consolação",
  city: "São Paulo",
  state: "SP",
  postal_code: "01304-001",
};

function localIso(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

function atDaysFromToday(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function placeholderPhoto(
  id: string,
  label: string,
): { id: string; url: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="#2F80ED" width="800" height="600"/><text x="50%" y="50%" fill="#ffffff" font-family="sans-serif" font-size="32" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return {
    id,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

function buildMockAgendaEvents(): WorkerAgendaEvent[] {
  const todayMorning = atDaysFromToday(0, 10, 0);
  const todayAfternoon = atDaysFromToday(0, 14, 0);
  const tomorrow = atDaysFromToday(1, 9, 0);
  const laterThisWeek = atDaysFromToday(3, 16, 0);
  const twoDaysAgo = atDaysFromToday(-2, 11, 0);

  const lastMonth = addMonths(new Date(), -1);
  lastMonth.setDate(10);
  lastMonth.setHours(10, 0, 0, 0);

  const nextMonth = addMonths(new Date(), 1);
  nextMonth.setDate(5);
  nextMonth.setHours(15, 0, 0, 0);

  return [
    {
      id: "mock-agenda-001",
      order_id: "mock-order-agenda-001",
      title: "Instalação de torneira",
      description:
        "Troca da torneira da pia da cozinha e verificação de vazamentos na conexão.",
      scheduled_at: localIso(todayMorning),
      scheduled_end_at: localIso(atDaysFromToday(0, 11, 0)),
      order_status: "IN_PROGRESS",
      address: SAO_PAULO_ADDRESS,
      photos: [
        placeholderPhoto("mock-photo-001", "Foto 1"),
        placeholderPhoto("mock-photo-002", "Foto 2"),
      ],
      payment: {
        status: "PAID",
        amount: 180,
        paid_at: localIso(atDaysFromToday(-3, 12, 0)),
      },
    },
    {
      id: "mock-agenda-002",
      order_id: "mock-order-agenda-002",
      title: "Reparo elétrico",
      description: "Substituição de disjuntor e revisão das tomadas da sala.",
      scheduled_at: localIso(todayAfternoon),
      scheduled_end_at: localIso(atDaysFromToday(0, 16, 0)),
      order_status: "IN_PROGRESS",
      address: {
        ...SAO_PAULO_ADDRESS,
        street: "Avenida Paulista",
        number: "900",
        neighborhood: "Bela Vista",
        postal_code: "01310-100",
      },
      photos: [placeholderPhoto("mock-photo-003", "Quadro elétrico")],
      payment: {
        status: "PAID",
        amount: 250,
        paid_at: localIso(atDaysFromToday(-2, 9, 0)),
      },
    },
    {
      id: "mock-agenda-003",
      order_id: "mock-order-agenda-003",
      title: "Pintura de parede",
      description:
        "Pintura de duas paredes do quarto com tinta acrílica branca.",
      scheduled_at: localIso(tomorrow),
      scheduled_end_at: localIso(atDaysFromToday(1, 12, 0)),
      order_status: "IN_PROGRESS",
      address: {
        ...SAO_PAULO_ADDRESS,
        street: "Rua da Consolação",
        number: "320",
        postal_code: "01301-000",
      },
      photos: [],
      payment: {
        status: "PAID",
        amount: 420,
        paid_at: localIso(atDaysFromToday(-1, 18, 0)),
      },
    },
    {
      id: "mock-agenda-004",
      order_id: "mock-order-agenda-004",
      title: "Montagem de móveis",
      description: "Montagem de guarda-roupa e cômoda no quarto do casal.",
      scheduled_at: localIso(laterThisWeek),
      scheduled_end_at: localIso(
        (() => {
          const end = new Date(laterThisWeek);
          end.setHours(18, 0, 0, 0);
          return end;
        })(),
      ),
      order_status: "IN_PROGRESS",
      address: {
        ...SAO_PAULO_ADDRESS,
        street: "Rua Haddock Lobo",
        number: "595",
        neighborhood: "Cerqueira César",
        postal_code: "01414-001",
      },
      photos: [placeholderPhoto("mock-photo-004", "Móveis")],
      payment: {
        status: "PAID",
        amount: 310,
        paid_at: localIso(atDaysFromToday(-4, 11, 0)),
      },
    },
    {
      id: "mock-agenda-005",
      order_id: "mock-order-agenda-005",
      title: "Limpeza pós-obra",
      description: "Limpeza completa do apartamento após reforma da cozinha.",
      scheduled_at: localIso(twoDaysAgo),
      scheduled_end_at: localIso(atDaysFromToday(-2, 13, 0)),
      order_status: "IN_PROGRESS",
      address: {
        ...SAO_PAULO_ADDRESS,
        street: "Rua Oscar Freire",
        number: "379",
        neighborhood: "Jardins",
        postal_code: "01426-001",
      },
      photos: [placeholderPhoto("mock-photo-005", "Cozinha")],
      payment: {
        status: "PAID",
        amount: 390,
        paid_at: localIso(atDaysFromToday(-5, 10, 0)),
      },
    },
    {
      id: "mock-agenda-006",
      order_id: "mock-order-agenda-006",
      title: "Conserto de vazamento",
      description: "Reparo no registro do chuveiro e troca da vedação.",
      scheduled_at: localIso(lastMonth),
      scheduled_end_at: localIso(
        (() => {
          const end = new Date(lastMonth);
          end.setHours(11, 30, 0, 0);
          return end;
        })(),
      ),
      order_status: "COMPLETED",
      address: {
        ...SAO_PAULO_ADDRESS,
        street: "Rua Bela Cintra",
        number: "986",
        neighborhood: "Consolação",
        postal_code: "01415-000",
      },
      photos: [
        placeholderPhoto("mock-photo-006", "Antes"),
        placeholderPhoto("mock-photo-007", "Depois"),
      ],
      payment: {
        status: "PAID",
        amount: 160,
        paid_at: localIso(
          (() => {
            const paid = new Date(lastMonth);
            paid.setDate(paid.getDate() - 2);
            return paid;
          })(),
        ),
      },
    },
    {
      id: "mock-agenda-007",
      order_id: "mock-order-agenda-007",
      title: "Instalação de ar-condicionado",
      description:
        "Instalação de split 12.000 BTUs na sala, incluindo suporte e drenagem.",
      scheduled_at: localIso(nextMonth),
      scheduled_end_at: localIso(
        (() => {
          const end = new Date(nextMonth);
          end.setHours(17, 30, 0, 0);
          return end;
        })(),
      ),
      order_status: "IN_PROGRESS",
      address: {
        ...SAO_PAULO_ADDRESS,
        street: "Alameda Santos",
        number: "2400",
        neighborhood: "Cerqueira César",
        postal_code: "01418-200",
      },
      photos: [placeholderPhoto("mock-photo-008", "Sala")],
      payment: {
        status: "PAID",
        amount: 680,
        paid_at: localIso(atDaysFromToday(-1, 8, 0)),
      },
    },
  ];
}

const MOCK_AGENDA_EVENTS = buildMockAgendaEvents();

export function getMockAgendaEvents(
  range?: WorkerAgendaRange,
): WorkerAgendaEvent[] {
  if (!range) {
    return MOCK_AGENDA_EVENTS.map((event) => ({
      ...event,
      photos: [...event.photos],
    }));
  }

  return MOCK_AGENDA_EVENTS.filter((event) => {
    const day = format(new Date(event.scheduled_at), "yyyy-MM-dd");
    return day >= range.from && day <= range.to;
  }).map((event) => ({
    ...event,
    photos: [...event.photos],
  }));
}
