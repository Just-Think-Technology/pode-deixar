import { apiFetchAuth } from "@/api/client";
import type {
  CreateProviderProfilePayload,
  ProfileResponse,
  RequestEmailChangePayload,
  RequestEmailChangeResponse,
  UpdateProviderProfilePayload,
} from "@/lib/auth/types";

export const WORKER_PROFILE_ROUTES = {
  getProfile: "/profiles/me",
  createProfile: "/profiles/provider",
  updateProfile: "/profiles/provider",
  deleteAccount: "/auth/account",
  requestEmailChange: "/auth/request-email-change",
} as const;

export function getWorkerProfile(accessToken: string) {
  return apiFetchAuth<ProfileResponse>(WORKER_PROFILE_ROUTES.getProfile, accessToken, {
    method: "GET",
  });
}

export function createWorkerProfile(
  accessToken: string,
  payload: CreateProviderProfilePayload,
) {
  return apiFetchAuth<ProfileResponse>(
    WORKER_PROFILE_ROUTES.createProfile,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateWorkerProfile(
  accessToken: string,
  payload: UpdateProviderProfilePayload,
) {
  return apiFetchAuth<ProfileResponse>(
    WORKER_PROFILE_ROUTES.updateProfile,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function requestEmailChange(
  accessToken: string,
  payload: RequestEmailChangePayload,
) {
  return apiFetchAuth<RequestEmailChangeResponse>(
    WORKER_PROFILE_ROUTES.requestEmailChange,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteWorkerAccount(accessToken: string) {
  return apiFetchAuth<{ message: string }>(
    WORKER_PROFILE_ROUTES.deleteAccount,
    accessToken,
    {
      method: "DELETE",
    },
  );
}
