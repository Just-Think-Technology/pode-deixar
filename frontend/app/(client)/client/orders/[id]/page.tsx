import { notFound } from "next/navigation";

import ClientOrderDetailPage from "@/components/pages/client-order-detail-page";
import { getMyOrderByIdAction } from "@/lib/client/orders/actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ClientOrderDetailRoute({ params }: Props) {
  const { id } = await params;
  const order = await getMyOrderByIdAction(id);

  if (!order) {
    notFound();
  }

  return <ClientOrderDetailPage order={order} />;
}
