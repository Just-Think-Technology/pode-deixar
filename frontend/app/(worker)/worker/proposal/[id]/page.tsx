import { notFound } from "next/navigation";

import WorkerProposalDetailPage from "@/components/pages/worker-proposal-detail-page";
import { getMyProposalByIdAction } from "@/lib/worker/proposal/actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function WorkerProposalDetailRoute({ params }: Props) {
  const { id } = await params;
  const proposal = await getMyProposalByIdAction(id);

  if (!proposal) {
    notFound();
  }

  return <WorkerProposalDetailPage proposal={proposal} />;
}
