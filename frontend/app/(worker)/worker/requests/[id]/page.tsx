import { notFound } from "next/navigation";

import WorkerRequestDetailPage from "@/components/pages/worker-request-detail-page";
import { getReceivedRequestByIdAction } from "@/lib/worker/requests/actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorkerRequestDetailRoute({ params }: Props) {
  const { id } = await params;
  const request = await getReceivedRequestByIdAction(id);

  if (!request) {
    notFound();
  }

  return <WorkerRequestDetailPage request={request} />;
}
