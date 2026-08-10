import { notFound } from "next/navigation";

import ClientCheckoutPage from "@/components/pages/client-checkout-page";
import { getMyOrderByIdAction } from "@/lib/client/orders/actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ClientCheckoutRoute({ params }: Props) {
  const { id } = await params;
  const order = await getMyOrderByIdAction(id);

  if (!order) {
    notFound();
  }

  return <ClientCheckoutPage order={order} />;
}
