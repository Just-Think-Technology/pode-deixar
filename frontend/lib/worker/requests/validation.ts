import type { ValidationResult } from "@/lib/auth/types";
import type { CreateProposalPayload } from "@/lib/worker/requests/types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(errors: Record<string, string>): ValidationResult {
  return { ok: false, errors };
}

export function parseCreateProposalForm(
  form: HTMLFormElement,
  serviceOrderId: string,
): CreateProposalPayload {
  const data = new FormData(form);
  const priceRaw = String(data.get("price") ?? "").trim().replace(",", ".");
  const estimatedDuration = String(data.get("estimatedDuration") ?? "").trim();

  return {
    serviceOrderId,
    price: Number(priceRaw),
    description: String(data.get("description") ?? "").trim(),
    ...(estimatedDuration && { estimatedDuration }),
  };
}

export function validateCreateProposal(
  payload: CreateProposalPayload,
): ValidationResult {
  const errors: Record<string, string> = {};

  const serviceOrderId = payload.serviceOrderId?.trim() ?? "";
  if (!serviceOrderId) {
    errors.serviceOrderId = "Pedido inválido";
  } else if (
    !UUID_REGEX.test(serviceOrderId) &&
    !serviceOrderId.startsWith("mock-")
  ) {
    errors.serviceOrderId = "Pedido inválido";
  }

  if (
    payload.price == null ||
    Number.isNaN(payload.price) ||
    payload.price <= 0
  ) {
    errors.price = "Informe um preço válido maior que zero";
  }

  const description = payload.description?.trim() ?? "";
  if (description.length < 10 || description.length > 2000) {
    errors.description = "Descrição deve ter entre 10 e 2000 caracteres";
  }

  const estimatedDuration = payload.estimatedDuration?.trim() ?? "";
  if (estimatedDuration.length > 100) {
    errors.estimatedDuration = "Duração estimada deve ter no máximo 100 caracteres";
  }

  return Object.keys(errors).length > 0 ? fail(errors) : { ok: true };
}
