import { ApiError } from "@/api/client";

export function formatCompletionAmount(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatCompletionDateTime(iso: string): string {
  const date = new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} às ${time}`;
}

export function getCompletionOrderErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return "Você não tem permissão para concluir este serviço.";
    }
    if (err.status === 404) {
      return "Serviço não encontrado.";
    }
    if (err.status === 400) {
      return typeof err.message === "string"
        ? err.message
        : "Não foi possível concluir o serviço.";
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Não foi possível concluir o serviço. Ocorreu um problema ao registrar a conclusão. Tente novamente.";
}

export function getUploadPhotoErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return "Não foi possível enviar a foto. Tente novamente.";
}
