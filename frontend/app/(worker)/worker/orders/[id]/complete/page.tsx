import { notFound } from "next/navigation";

import WorkerOrderCompletePage from "@/components/pages/worker-order-complete-page";
import {
  getCompletionHistoryAction,
  getCompletionOrderAction,
} from "@/lib/worker/orders/actions";
import { setMockCompletionFailure } from "@/mock/worker/completion";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ falha?: string }>;
};

export default async function WorkerOrderCompleteRoute({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { falha } = await searchParams;

  // Demonstração do Estado 7 (erro) com `?falha=1`. Uso exclusivo do mock.
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    setMockCompletionFailure(id, falha === "1");
  }

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
