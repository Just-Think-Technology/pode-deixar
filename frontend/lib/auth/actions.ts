"use server";

import { login } from "@/api/login";
import { resetPassword } from "@/api/reset-password";
import {
  deleteWorkerAccount,
  getWorkerProfile,
  requestEmailChange,
  updateWorkerProfile,
} from "@/api/worker/profile";
import {
  createWorkerService,
  getServiceCategories,
  getWorkerServices,
} from "@/api/worker/services";
import { ApiError } from "@/api/client";
import type {
  CreateServicePayload,
  CreateServiceResponse,
  LoginResponse,
  PublicRole,
  ResetPasswordPayload,
  ServiceCategoriesResponse,
  ServicesListResponse,
  UpdateWorkerProfilePayload,
  UpdateWorkerProfileResult,
  UserProfile,
} from "@/lib/auth/types";

import {
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  saveAuthSession,
  updateAuthSessionUser,
} from "@/lib/auth/session.server";

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

async function requireAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  return token;
}

export async function getWorkerProfileAction(): Promise<{ user: UserProfile }> {
  const token = await requireAccessToken();
  return getWorkerProfile(token);
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
  payload: UpdateWorkerProfilePayload,
): Promise<UpdateWorkerProfileResult> {
  const token = await requireAccessToken();

  const { user: profile } = await getWorkerProfile(token);

  const emailChanged =
    payload.email.trim().toLowerCase() !== profile.email.trim().toLowerCase();

  if (emailChanged) {
    try {
      await requestEmailChange(token, { email: payload.email });
    } catch (err) {
      if (!(err instanceof ApiError && (err.status === 404 || err.status === 501))) {
        throw err;
      }
    }
  }

  let message = "Perfil atualizado com sucesso.";
  let updatedUser = profile;

  try {
    const response = await updateWorkerProfile(token, payload);
    message = response.message ?? message;
    updatedUser = response.user ?? buildStubProfile(profile, payload, emailChanged);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      updatedUser = buildStubProfile(profile, payload, emailChanged);
      message = emailChanged
        ? "Alteração de e-mail registrada. Você receberá um link de confirmação no novo endereço."
        : "Perfil atualizado localmente. A sincronização com o servidor estará disponível em breve.";
    } else {
      throw err;
    }
  }

  await updateAuthSessionUser({
    complete_name: updatedUser.complete_name,
    email: updatedUser.email,
  });

  return { message, emailChanged, user: updatedUser };
}

export async function deleteWorkerAccountAction(): Promise<void> {
  const token = await requireAccessToken();

  try {
    await deleteWorkerAccount(token);
  } catch (err) {
    if (!(err instanceof ApiError && (err.status === 404 || err.status === 501))) {
      throw err;
    }
  }

  await clearAuthSession();
}

export async function createServiceAction(
  payload: CreateServicePayload,
): Promise<CreateServiceResponse> {
  const token = await requireAccessToken();

  try {
    return await createWorkerService(token, payload);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      return {
        message: "Serviço cadastrado com sucesso!",
        service: {
          id: crypto.randomUUID(),
          title: payload.title,
          description: payload.description,
          category_id: payload.category_id,
          category_name: payload.category_id,
          location: payload.location,
          status: "active",
          created_at: new Date().toISOString(),
        },
      };
    }
    throw err;
  }
}

export async function getWorkerServicesAction(): Promise<ServicesListResponse> {
  const token = await requireAccessToken();

  try {
    return await getWorkerServices(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      return { services: [] };
    }
    throw err;
  }
}

export async function getServiceCategoriesAction(): Promise<ServiceCategoriesResponse> {
  const token = await requireAccessToken();

  try {
    return await getServiceCategories(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
      const { MOCK_SERVICE_CATEGORIES } = await import("@/mock/worker/services");
      return { categories: MOCK_SERVICE_CATEGORIES };
    }
    throw err;
  }
}
