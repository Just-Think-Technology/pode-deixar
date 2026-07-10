import type { ValidationResult } from "@/lib/auth/types";
import type { CreateServiceOrderPayload } from "@/lib/client/quote/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(errors: Record<string, string>): ValidationResult {
  return { ok: false, errors };
}

function parseOptionalBudget(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseCreateServiceOrderForm(
  form: HTMLFormElement,
): CreateServiceOrderPayload {
  const data = new FormData(form);
  const budgetMin = parseOptionalBudget(String(data.get("budgetMin") ?? ""));
  const budgetMax = parseOptionalBudget(String(data.get("budgetMax") ?? ""));

  return {
    title: String(data.get("title") ?? "").trim(),
    description: String(data.get("description") ?? "").trim(),
    categoryId: String(data.get("categoryId") ?? "").trim(),
    ...(budgetMin != null && { budgetMin }),
    ...(budgetMax != null && { budgetMax }),
  };
}

export function validateCreateServiceOrder(
  payload: CreateServiceOrderPayload,
): ValidationResult {
  const errors: Record<string, string> = {};

  const title = payload.title?.trim() ?? "";
  if (title.length < 3 || title.length > 200) {
    errors.title = "Título deve ter entre 3 e 200 caracteres";
  }

  const description = payload.description?.trim() ?? "";
  if (description.length < 10 || description.length > 2000) {
    errors.description = "Descrição deve ter entre 10 e 2000 caracteres";
  }

  const categoryId = payload.categoryId?.trim() ?? "";
  if (!categoryId) {
    errors.categoryId = "Selecione uma categoria";
  } else if (!UUID_REGEX.test(categoryId)) {
    errors.categoryId = "Categoria inválida";
  }

  if (payload.budgetMin != null) {
    if (payload.budgetMin < 0) {
      errors.budgetMin = "Orçamento mínimo deve ser maior ou igual a zero";
    }
  }

  if (payload.budgetMax != null) {
    if (payload.budgetMax <= 0) {
      errors.budgetMax = "Orçamento máximo deve ser maior que zero";
    }
  }

  if (
    payload.budgetMin != null &&
    payload.budgetMax != null &&
    payload.budgetMax < payload.budgetMin
  ) {
    errors.budgetMax =
      "Orçamento máximo deve ser maior ou igual ao orçamento mínimo";
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}
