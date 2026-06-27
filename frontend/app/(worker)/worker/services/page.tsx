import WorkerServicesPage from "@/components/pages/worker-services-page";
import { getWorkerServicesAction } from "@/lib/auth/actions";

export default async function ServicesRoute() {
  const { services } = await getWorkerServicesAction();
  return <WorkerServicesPage services={services} />;
}
