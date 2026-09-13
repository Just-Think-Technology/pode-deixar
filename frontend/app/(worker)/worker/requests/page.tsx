// purpose: Worker requests route — lists received requests with action integration
import WorkerRequestsPage from "@/components/pages/worker-requests-page";
import { getReceivedRequestsAction } from "@/lib/worker/requests/actions";

export default async function WorkerRequestsRoute() {
  const requests = await getReceivedRequestsAction();
  return <WorkerRequestsPage requests={requests} />;
}
