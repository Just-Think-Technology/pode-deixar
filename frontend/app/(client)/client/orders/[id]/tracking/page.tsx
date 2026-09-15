// purpose: Client tracking route — shows hiring follow-up and status timeline
import { notFound } from "next/navigation";

import ClientTrackingPage from "@/components/pages/client-tracking-page";
import { getContractTrackingAction } from "@/lib/tracking/actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ClientTrackingRoute({ params }: Props) {
  const { id } = await params;
  const tracking = await getContractTrackingAction(id, "CLIENT");

  if (!tracking) {
    notFound();
  }

  return <ClientTrackingPage tracking={tracking} />;
}
