import { apiFetchAuth } from "@/api/client";
import type {
  CreateServicePayload,
  CreateServiceResponse,
  DeleteServiceResponse,
  ServicesListResponse,
  UpdateServicePayload,
  UpdateServiceResponse,
} from "@/lib/auth/types";

export const WORKER_SERVICES_ROUTES = {
  base: "/providers/me/services",
} as const;

export function createWorkerService(
  accessToken: string,
  payload: CreateServicePayload,
) {
  return apiFetchAuth<CreateServiceResponse>(
    WORKER_SERVICES_ROUTES.base,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getWorkerServices(accessToken: string) {
  return apiFetchAuth<ServicesListResponse>(
    WORKER_SERVICES_ROUTES.base,
    accessToken,
    { method: "GET" },
  );
}

export function updateWorkerService(
  accessToken: string,
  serviceId: string,
  payload: UpdateServicePayload,
) {
  return apiFetchAuth<UpdateServiceResponse>(
    `${WORKER_SERVICES_ROUTES.base}/${serviceId}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteWorkerService(
  accessToken: string,
  serviceId: string,
) {
  return apiFetchAuth<DeleteServiceResponse>(
    `${WORKER_SERVICES_ROUTES.base}/${serviceId}`,
    accessToken,
    { method: "DELETE" },
  );
}
