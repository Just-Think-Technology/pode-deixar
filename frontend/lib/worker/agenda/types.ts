export type WorkerAgendaOrderStatus = "IN_PROGRESS" | "COMPLETED";

export type WorkerAgendaAddress = {
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

export type WorkerAgendaPhoto = {
  id: string;
  url: string;
};

export type WorkerAgendaPayment = {
  status: "PAID";
  amount: number;
  paid_at: string;
};

export type WorkerAgendaEvent = {
  id: string;
  order_id: string;
  title: string;
  description: string;
  scheduled_at: string;
  scheduled_end_at: string | null;
  order_status: WorkerAgendaOrderStatus;
  address: WorkerAgendaAddress;
  photos: WorkerAgendaPhoto[];
  payment: WorkerAgendaPayment;
};

export type WorkerAgendaRange = {
  from: string;
  to: string;
};
