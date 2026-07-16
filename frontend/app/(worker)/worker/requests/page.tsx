import WorkerRequestsPage from "@/components/pages/worker-requests-page";
import { getReceivedRequestsAction } from "@/lib/worker/requests/actions";

export default async function WorkerRequestsRoute() {
  const requests = await getReceivedRequestsAction();
  return <WorkerRequestsPage requests={requests} />;
}
