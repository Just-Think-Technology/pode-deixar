// Client quote validation — quote form validators

import type { ValidationResult } from "@/lib/auth/types";
import type {
  CreateServiceOrderPayload,
  ServiceOrderAddress,
} from "@/lib/client/quote/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 2000;
const STATE_LENGTH = 2;

function fail(errors: Record<string, string>): ValidationResult {
  return { ok: false, errors };
}

function parseOptionalBudget(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseAddress(form: FormData): ServiceOrderAddress {
  return {
    street: String(form.get("street") ?? "").trim(),
    number: String(form.get("number") ?? "").trim(),
    neighborhood: String(form.get("neighborhood") ?? "").trim(),
    city: String(form.get("city") ?? "").trim(),
    state: String(form.get("state") ?? "").trim().toUpperCase(),
    postalCode: String(form.get("postalCode") ?? "").trim(),
  };
}

export function parseCreateServiceOrderForm(
  form: HTMLFormElement,
  providerId?: string,
): CreateServiceOrderPayload {
  const data = new FormData(form);
  const budgetMin = parseOptionalBudget(String(data.get("budgetMin") ?? ""));
  const budgetMax = parseOptionalBudget(String(data.get("budgetMax") ?? ""));
  const address = parseAddress(data);

  return {
    title: String(data.get("title") ?? "").trim(),
    description: String(data.get("description") ?? "").trim(),
    categoryId: String(data.get("categoryId") ?? "").trim(),
    ...(providerId ? { providerId } : {}),
    ...(budgetMin != null && { budgetMin }),
    ...(budgetMax != null && { budgetMax }),
    address,
  };
}

function validateTitle(title: string | undefined): string | undefined {
  const value = title?.trim() ?? "";
  if (value.length < TITLE_MIN_LENGTH || value.length > TITLE_MAX_LENGTH) {
    return "Título deve ter entre 3 e 200 caracteres";
  }
  return undefined;
}

function validateDescription(description: string | undefined): string | undefined {
  const value = description?.trim() ?? "";
  if (
    value.length < DESCRIPTION_MIN_LENGTH ||
    value.length > DESCRIPTION_MAX_LENGTH
  ) {
    return "Descrição deve ter entre 10 e 2000 caracteres";
  }
  return undefined;
}

function validateCategoryId(categoryId: string | undefined): string | undefined {
  const value = categoryId?.trim() ?? "";
  if (!value) {
    return "Selecione uma categoria";
  }
  if (!UUID_REGEX.test(value)) {
    return "Categoria inválida";
  }
  return undefined;
}

function validateAddress(
  address: CreateServiceOrderPayload["address"],
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!address?.street?.trim()) {
    errors.street = "Informe o logradouro";
  }
  if (!address?.number?.trim()) {
    errors.number = "Informe o número";
  }
  if (!address?.city?.trim()) {
    errors.city = "Informe a cidade";
  }
  if (!address?.state?.trim()) {
    errors.state = "Informe a UF";
  } else if (address.state.trim().length !== STATE_LENGTH) {
    errors.state = "UF deve ter 2 letras";
  }
  return errors;
}

function validateBudgets(
  payload: CreateServiceOrderPayload,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (payload.budgetMin != null && payload.budgetMin < 0) {
    errors.budgetMin = "Orçamento mínimo deve ser maior ou igual a zero";
  }
  if (payload.budgetMax != null && payload.budgetMax <= 0) {
    errors.budgetMax = "Orçamento máximo deve ser maior que zero";
  }
  if (
    payload.budgetMin != null &&
    payload.budgetMax != null &&
    payload.budgetMax < payload.budgetMin
  ) {
    errors.budgetMax =
      "Orçamento máximo deve ser maior ou igual ao orçamento mínimo";
  }
  return errors;
}

export function validateCreateServiceOrder(
  payload: CreateServiceOrderPayload,
): ValidationResult {
  const errors: Record<string, string> = {
    ...validateAddress(payload.address),
    ...validateBudgets(payload),
  };

  const titleError = validateTitle(payload.title);
  if (titleError) {
    errors.title = titleError;
  }
  const descriptionError = validateDescription(payload.description);
  if (descriptionError) {
    errors.description = descriptionError;
  }
  const categoryError = validateCategoryId(payload.categoryId);
  if (categoryError) {
    errors.categoryId = categoryError;
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}
