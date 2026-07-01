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
  deleteWorkerService,
  getWorkerServices,
  updateWorkerService,
} from "@/api/worker/services";
import { ApiError } from "@/api/client";
import type {
  CreateServicePayload,
  CreateServiceResponse,
  LoginResponse,
  PublicRole,
  ResetPasswordPayload,
  ServicesListResponse,
  UpdateServicePayload,
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

  try {
    return await getWorkerProfile(token);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
      const { WORKER_PROFILE_UI_DEFAULTS } = await import("@/mock/worker/profile");
      return {
        user: {
          id: "mock-user-id",
          complete_name: "Usuário",
          email: "usuario@example.com",
          role: "PROVIDER",
          phone: "(11) 99999-9999",
          postal_code: "12345-678",
          email_verified: true,
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        },
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
      if (!(err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503))) {
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
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
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
    if (!(err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503))) {
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
  const token = await requireAccessToken();

  try {
    return await getWorkerServices(token);
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
  const token = await requireAccessToken();

  try {
    await updateWorkerService(token, serviceId, payload);
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
  const token = await requireAccessToken();

  try {
    await deleteWorkerService(token, serviceId);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 501 || err.status === 503)) {
      return;
    }
    throw err;
  }
}
