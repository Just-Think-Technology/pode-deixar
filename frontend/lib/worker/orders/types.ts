import type {
  WorkerAgendaAddress,
  WorkerAgendaOrderStatus,
} from "@/lib/worker/agenda/types";

export type CompletionPhoto = {
  id: string;
  url: string;
  created_at: string;
};

export type CompletionOrder = {
  order_id: string;
  title: string;
  description: string;
  client_name: string;
  scheduled_at: string;
  scheduled_end_at: string | null;
  address: WorkerAgendaAddress;
  amount: number;
  order_status: WorkerAgendaOrderStatus;
};

export type CompletionHistory = {
  order_id: string;
  completed_at: string;
  completed_by: string;
  observations: string | null;
  photos: Array<{ id: string; url: string }>;
};

export type CompleteOrderInput = {
  observations?: string;
};

export type CompleteOrderResult = CompletionHistory;
