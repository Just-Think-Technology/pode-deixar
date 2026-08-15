export type WorkerAgendaOrderStatus = "IN_PROGRESS" | "COMPLETED";

export type WorkerAgendaAddress = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
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
