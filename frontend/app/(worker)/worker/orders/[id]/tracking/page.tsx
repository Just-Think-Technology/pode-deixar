// purpose: Worker tracking route — shows hiring follow-up and status timeline
import { notFound } from "next/navigation";

import WorkerTrackingPage from "@/components/pages/worker-tracking-page";
import { getContractTrackingAction } from "@/lib/tracking/actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorkerTrackingRoute({ params }: Props) {
  const { id } = await params;
  const tracking = await getContractTrackingAction(id, "PROVIDER");

  if (!tracking) {
    notFound();
  }

  return <WorkerTrackingPage tracking={tracking} />;
}
