// Auth actions — login, registration, and session server actions

"use server";

import { login } from "@/api/login";
import { resetPassword } from "@/api/reset-password";
import {
  createWorkerProfile,
  deleteWorkerAccount,
  getWorkerProfile,
  updateWorkerProfile,
} from "@/api/worker/profile";
import {
  createWorkerService,
  deleteWorkerService,
  getWorkerServices,
  updateWorkerService,
} from "@/api/worker/services";
import { ApiError } from "@/api/client";
import type {
  CreateServicePayload,
  CreateServiceResponse,
  LoginResponse,
  ProfileResponse,
  PublicRole,
  ResetPasswordPayload,
  ServicesListResponse,
  UpdateProviderProfilePayload,
  UpdateServicePayload,
  UpdateWorkerProfilePayload,
  UpdateWorkerProfileResult,
  UserProfile,
} from "@/lib/auth/types";

import {
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  refreshAuthSession,
  saveAuthSession,
  updateAuthSessionUser,
} from "@/lib/auth/session.server";

function mapProfileResponseToUserProfile(profile: ProfileResponse): UserProfile {
  return {
    id: profile.user.id,
    complete_name: profile.user.complete_name,
    email: profile.user.email,
    role: profile.user.role,
    phone: profile.user.phone,
    postal_code: profile.user.postal_code,
    email_verified: true,
    created_at: profile.created_at,
    last_login_at: null,
    profile_id: profile.id,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    hourly_rate: profile.hourly_rate,
    skills: profile.skills,
    portfolio: profile.portfolio,
    rating: profile.rating,
    total_reviews: profile.total_reviews,
    is_available: profile.is_available,
  };
}

export async function saveAuthSessionAction(data: LoginResponse): Promise<void> {
  await saveAuthSession(data);
}

export async function clearAuthSessionAction(): Promise<void> {
  await clearAuthSession();
}

export async function getAuthUserAction() {
  const session = await getAuthSession();
  return session?.user ?? null;
}

export async function resetPasswordAction(
  payload: ResetPasswordPayload,
): Promise<{ role: PublicRole }> {
  const resetResult = await resetPassword(payload);

  const loginData = await login({
    email: resetResult.user.email,
    password: payload.newPassword,
  });

  await saveAuthSession(loginData);

  return { role: loginData.user.role };
}

async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await refreshAuthSession();
      if (!refreshed?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      return await fn(refreshed.access_token);
    }
    throw err;
  }
}

export async function getWorkerProfileAction(): Promise<{ user: UserProfile }> {
  const profile = await withTokenRefresh((token) => getWorkerProfile(token));
  return { user: mapProfileResponseToUserProfile(profile) };
}

export async function updateWorkerProfileAction(
  payload: UpdateProviderProfilePayload,
): Promise<UpdateWorkerProfileResult> {
  const profileResponse = await withTokenRefresh((token) => getWorkerProfile(token));
  const currentProfile = mapProfileResponseToUserProfile(profileResponse);

  let message = "Perfil atualizado com sucesso.";
  let updatedUser = currentProfile;

  if (currentProfile.profile_id) {
    const response = await withTokenRefresh((token) => updateWorkerProfile(token, payload));
    updatedUser = response ? mapProfileResponseToUserProfile(response) : currentProfile;
    message = "Perfil atualizado com sucesso.";
  } else {
    const response = await withTokenRefresh((token) => createWorkerProfile(token, payload));
    updatedUser = response ? mapProfileResponseToUserProfile(response) : currentProfile;
    message = "Perfil profissional criado com sucesso!";
  }

  await updateAuthSessionUser({
    complete_name: updatedUser.complete_name,
    email: updatedUser.email,
  });

  return { message, emailChanged: false, user: updatedUser };
}

export async function deleteWorkerAccountAction(): Promise<void> {
  await withTokenRefresh((token) => deleteWorkerAccount(token));
  await clearAuthSession();
}

export async function createServiceAction(
  payload: CreateServicePayload,
): Promise<CreateServiceResponse> {
  return withTokenRefresh((token) => createWorkerService(token, payload));
}

export async function getWorkerServicesAction(): Promise<ServicesListResponse> {
  return withTokenRefresh((token) => getWorkerServices(token));
}

export async function updateServiceAction(
  serviceId: string,
  payload: UpdateServicePayload,
): Promise<void> {
  await withTokenRefresh((token) => updateWorkerService(token, serviceId, payload));
}

export async function deleteServiceAction(
  serviceId: string,
): Promise<void> {
  await withTokenRefresh((token) => deleteWorkerService(token, serviceId));
}
