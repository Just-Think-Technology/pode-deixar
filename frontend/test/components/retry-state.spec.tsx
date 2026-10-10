// Retry state spec — generic reload placeholder

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { RetryState } from "@/components/shared/retry-state";

describe("RetryState", () => {
  it("renders title, message and retry button", () => {
    render(
      <RetryState
        title="Erro ao carregar"
        message="Não foi possível conectar ao servidor."
        onRetry={() => {}}
        isRetrying={false}
      />,
    );

    expect(screen.getByText("Erro ao carregar")).toBeTruthy();
    expect(
      screen.getByText("Não foi possível conectar ao servidor."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeTruthy();
  });

  it("disables the button while retrying", () => {
    const onRetry = vi.fn();
    render(
      <RetryState
        title="Erro ao carregar"
        message="Falha temporária."
        onRetry={onRetry}
        isRetrying={true}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Tentando novamente...",
    });
    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(button);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("calls onRetry when idle", () => {
    const onRetry = vi.fn();
    render(
      <RetryState
        title="Erro ao carregar"
        message="Falha temporária."
        onRetry={onRetry}
        isRetrying={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
