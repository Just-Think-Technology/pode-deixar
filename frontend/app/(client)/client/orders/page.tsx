// purpose: Client orders route — lists client orders with action integration
import ClientOrdersPage from "@/components/pages/client-orders-page";
import { getMyOrdersAction } from "@/lib/client/orders/actions";

export default async function ClientOrdersRoute() {
  const orders = await getMyOrdersAction();
  return <ClientOrdersPage orders={orders} />;
}
