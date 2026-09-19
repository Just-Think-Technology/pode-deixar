import { notFound } from "next/navigation";

import WorkerOrderCompletePage from "@/components/pages/worker-order-complete-page";
import {
  getCompletionHistoryAction,
  getCompletionOrderAction,
} from "@/lib/worker/orders/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ falha?: string }>;
};

export default async function WorkerOrderCompleteRoute({
  params,
}: Props) {
  const { id } = await params;

  const order = await getCompletionOrderAction(id);
  if (!order) {
    notFound();
  }

  const history =
    order.order_status === "COMPLETED"
      ? await getCompletionHistoryAction(id)
      : null;

  return <WorkerOrderCompletePage order={order} history={history} />;
}
