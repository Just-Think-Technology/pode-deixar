import WorkerCreateServicePage from "@/components/pages/worker-create-service-page";
import { getServiceCategoriesAction } from "@/lib/auth/actions";

export default async function CreateServiceRoute() {
  const { categories } = await getServiceCategoriesAction();
  return <WorkerCreateServicePage categories={categories} />;
}
