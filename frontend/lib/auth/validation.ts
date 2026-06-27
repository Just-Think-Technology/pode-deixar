import type {
  CreateServicePayload,
  LoginPayload,
  RegisterPayload,
  UpdateWorkerProfilePayload,
  ValidationResult,
} from "@/lib/auth/types";

const NAME_REGEX = /^[\p{L}\s'-]+$/u;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(errors: Record<string, string>): ValidationResult {
  return { ok: false, errors };
}

export function validateLogin(payload: LoginPayload): ValidationResult {
  const errors: Record<string, string> = {};

  if (!payload.email?.trim()) {
    errors.email = "E-mail é obrigatório";
  } else if (!EMAIL_REGEX.test(payload.email)) {
    errors.email = "E-mail inválido";
  }

  if (!payload.password) {
    errors.password = "Senha é obrigatória";
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}

export function validateRegister(payload: RegisterPayload): ValidationResult {
  const errors: Record<string, string> = {};

  const name = payload.complete_name?.trim() ?? "";
  if (name.length < 3 || name.length > 50) {
    errors.complete_name = "Nome deve ter entre 3 e 50 caracteres";
  } else if (!NAME_REGEX.test(name)) {
    errors.complete_name = "Nome contém caracteres inválidos";
  }

  if (!payload.email?.trim()) {
    errors.email = "E-mail é obrigatório";
  } else if (!EMAIL_REGEX.test(payload.email)) {
    errors.email = "E-mail inválido";
  }

  if (!payload.phone?.trim()) {
    errors.phone = "Telefone é obrigatório";
  }

  if (!payload.postal_code?.trim()) {
    errors.postal_code = "CEP é obrigatório";
  }

  if (!payload.password) {
    errors.password = "Senha é obrigatória";
  } else if (!PASSWORD_REGEX.test(payload.password)) {
    errors.password =
      "Senha fraca: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 especial";
  }

  if (!payload.confirm_password) {
    errors["confirm-password"] = "Confirmação de senha é obrigatória";
  } else if (payload.password !== payload.confirm_password) {
    errors["confirm-password"] = "As senhas não coincidem";
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}

export function validateWorkerProfileUpdate(
  payload: UpdateWorkerProfilePayload,
): ValidationResult {
  const errors: Record<string, string> = {};

  const name = payload.complete_name?.trim() ?? "";
  if (name.length < 3 || name.length > 50) {
    errors.complete_name = "Nome deve ter entre 3 e 50 caracteres";
  } else if (!NAME_REGEX.test(name)) {
    errors.complete_name = "Nome contém caracteres inválidos";
  }

  if (!payload.email?.trim()) {
    errors.email = "E-mail é obrigatório";
  } else if (!EMAIL_REGEX.test(payload.email)) {
    errors.email = "E-mail inválido";
  }

  if (!payload.phone?.trim()) {
    errors.phone = "Telefone é obrigatório";
  }

  if (!payload.postal_code?.trim()) {
    errors.postal_code = "CEP é obrigatório";
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}

export function validateCreateService(
  payload: CreateServicePayload,
): ValidationResult {
  const errors: Record<string, string> = {};

  const title = payload.title?.trim() ?? "";
  if (title.length < 3 || title.length > 100) {
    errors.title = "Título deve ter entre 3 e 100 caracteres";
  }

  const description = payload.description?.trim() ?? "";
  if (description.length < 10 || description.length > 500) {
    errors.description = "Descrição deve ter entre 10 e 500 caracteres";
  }

  if (!payload.category_id?.trim()) {
    errors.category_id = "Selecione uma categoria";
  }

  if (!payload.location?.trim()) {
    errors.location = "Informe a cidade/estado de atuação";
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}
