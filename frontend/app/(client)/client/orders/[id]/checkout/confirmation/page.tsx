import { notFound, redirect } from "next/navigation";

import ClientCheckoutConfirmationPage from "@/components/pages/client-checkout-confirmation-page";
import { getMyOrderByIdAction } from "@/lib/client/orders/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paymentId?: string }>;
};

export default async function ClientCheckoutConfirmationRoute({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { paymentId } = await searchParams;

  if (!paymentId) {
    redirect(`/client/orders/${id}/checkout`);
  }

  const order = await getMyOrderByIdAction(id);
  if (!order) {
    notFound();
  }

  return (
    <ClientCheckoutConfirmationPage orderId={id} paymentId={paymentId} />
  );
}
