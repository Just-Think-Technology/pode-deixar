import WorkerServicesPage from "@/components/pages/worker-services-page";
import { getWorkerServicesAction } from "@/lib/auth/actions";

export default async function ServicesRoute() {
  const allServices = await getWorkerServicesAction();
  const services = allServices.filter((s) => s.is_active);
  return <WorkerServicesPage services={services} />;
}
