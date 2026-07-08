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

function buildMockProfile(sessionUser: {
  id: string;
  complete_name: string;
  email: string;
  phone?: string;
  postal_code?: string;
}): UserProfile {
  return {
    id: sessionUser.id,
    complete_name: sessionUser.complete_name,
    email: sessionUser.email,
    role: "PROVIDER",
    phone: sessionUser.phone ?? "(11) 99999-9999",
    postal_code: sessionUser.postal_code ?? "12345-678",
    email_verified: true,
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
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
  try {
    const profile = await withTokenRefresh((token) => getWorkerProfile(token));
    return { user: mapProfileResponseToUserProfile(profile) };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
      const session = await getAuthSession();
      return {
        user: buildMockProfile({
          id: session?.user.id ?? "mock-user-id",
          complete_name: session?.user.complete_name ?? "Usuário",
          email: session?.user.email ?? "usuario@example.com",
        }),
      };
    }
    throw err;
  }
}

function buildStubProfile(
  current: UserProfile,
  payload: UpdateWorkerProfilePayload,
  emailChanged: boolean,
): UserProfile {
  return {
    ...current,
    complete_name: payload.complete_name,
    email: payload.email,
    phone: payload.phone,
    postal_code: payload.postal_code,
    email_verified: emailChanged ? false : current.email_verified,
  };
}

export async function updateWorkerProfileAction(
  payload: UpdateProviderProfilePayload,
): Promise<UpdateWorkerProfileResult> {
  const profileResponse = await withTokenRefresh((token) => getWorkerProfile(token));
  const currentProfile = mapProfileResponseToUserProfile(profileResponse);

  let message = "Perfil atualizado com sucesso.";
  let updatedUser = currentProfile;

  try {
    if (currentProfile.profile_id) {
      const response = await withTokenRefresh((token) => updateWorkerProfile(token, payload));
      updatedUser = response ? mapProfileResponseToUserProfile(response) : currentProfile;
      message = "Perfil atualizado com sucesso.";
    } else {
      const response = await withTokenRefresh((token) => createWorkerProfile(token, payload));
      updatedUser = response ? mapProfileResponseToUserProfile(response) : currentProfile;
      message = "Perfil profissional criado com sucesso!";
    }
  } catch (err) {
    if (err instanceof ApiError && (err.status === 501 || err.status === 503)) {
      const stubPayload: UpdateWorkerProfilePayload = {
        complete_name: currentProfile.complete_name,
        email: currentProfile.email,
        phone: currentProfile.phone,
        postal_code: currentProfile.postal_code,
        biography: payload.bio ?? currentProfile.bio ?? "",
      };
      updatedUser = buildStubProfile(currentProfile, stubPayload, false);
      message = "Perfil atualizado localmente. A sincronização com o servidor estará disponível em breve.";
    } else {
      throw err;
    }
  }

  await updateAuthSessionUser({
    complete_name: updatedUser.complete_name,
    email: updatedUser.email,
  });

  return { message, emailChanged: false, user: updatedUser };
}

export async function deleteWorkerAccountAction(): Promise<void> {
  try {
    await withTokenRefresh((token) => deleteWorkerAccount(token));
  } catch (err) {
    if (!(err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503))) {
      throw err;
    }
  }

  await clearAuthSession();
}

export async function createServiceAction(
  payload: CreateServicePayload,
): Promise<CreateServiceResponse> {
  try {
    return await withTokenRefresh((token) => createWorkerService(token, payload));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
      return {
        message: "Serviço cadastrado com sucesso!",
        service: {
          id: crypto.randomUUID(),
          provider_profile_id: "mock-profile-id",
          title: payload.title,
          description: payload.description,
          fixed_price: payload.fixedPrice,
          category: payload.category,
          images: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }
    throw err;
  }
}

export async function getWorkerServicesAction(): Promise<ServicesListResponse> {
  try {
    return await withTokenRefresh((token) => getWorkerServices(token));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
      const { MOCK_SERVICES } = await import("@/mock/worker/services");
      return MOCK_SERVICES;
    }
    throw err;
  }
}

export async function updateServiceAction(
  serviceId: string,
  payload: UpdateServicePayload,
): Promise<void> {
  try {
    await withTokenRefresh((token) => updateWorkerService(token, serviceId, payload));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
      return;
    }
    throw err;
  }
}

export async function deleteServiceAction(
  serviceId: string,
): Promise<void> {
  try {
    await withTokenRefresh((token) => deleteWorkerService(token, serviceId));
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
      return;
    }
    throw err;
  }
}
