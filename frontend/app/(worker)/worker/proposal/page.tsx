// purpose: Worker proposals route — lists sent proposals with action integration
import WorkerProposalsPage from "@/components/pages/worker-proposals-page";
import { getMyProposalsAction } from "@/lib/worker/proposal/actions";

export default async function WorkerProposalsRoute() {
  const proposals = await getMyProposalsAction();
  return <WorkerProposalsPage proposals={proposals} />;
}
