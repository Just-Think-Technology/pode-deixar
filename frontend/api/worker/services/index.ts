import { apiFetchAuth } from "@/api/client";
import type {
  CreateServicePayload,
  CreateServiceResponse,
  ServiceCategoriesResponse,
  ServicesListResponse,
} from "@/lib/auth/types";

export const WORKER_SERVICES_ROUTES = {
  create: "/worker/services",
  list: "/worker/services",
  categories: "/worker/services/categories",
} as const;

export function createWorkerService(
  accessToken: string,
  payload: CreateServicePayload,
) {
  return apiFetchAuth<CreateServiceResponse>(
    WORKER_SERVICES_ROUTES.create,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getWorkerServices(accessToken: string) {
  return apiFetchAuth<ServicesListResponse>(
    WORKER_SERVICES_ROUTES.list,
    accessToken,
    {
      method: "GET",
    },
  );
}

export function getServiceCategories(accessToken: string) {
  return apiFetchAuth<ServiceCategoriesResponse>(
    WORKER_SERVICES_ROUTES.categories,
    accessToken,
    {
      method: "GET",
    },
  );
}
