import path from "node:path";

import { expect, test } from "@playwright/test";

import { loginAsWorkerMock } from "./helpers/auth";

const FIXTURE_PHOTO = path.resolve(__dirname, "fixtures/evidencia.png");

// Pedidos candidatos ao fluxo de conclusão (o teste usa o primeiro que ainda
// estiver em andamento, então repetições locais não quebram o spec).
const COMPLETION_CANDIDATES = [
  "mock-order-agenda-003",
  "mock-order-agenda-004",
  "mock-order-agenda-005",
  "mock-order-agenda-007",
  "mock-order-agenda-002",
];

test.describe("Provider completes service (JTT-106)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsWorkerMock(page);
  });

  test("agenda dialog offers finalization for in-progress services", async ({
    page,
  }) => {
    await page.goto("/worker/agenda");

    await page
      .getByRole("button", { name: /Instalação de torneira/ })
      .first()
      .click();

    const finalizeLink = page.getByRole("link", {
      name: "Finalizar serviço",
    });
    await expect(finalizeLink).toBeVisible();
    await expect(finalizeLink).toHaveAttribute(
      "href",
      "/worker/orders/mock-order-agenda-001/complete",
    );
  });

  test("shows the summary and keeps conclusion disabled without photos", async ({
    page,
  }) => {
    await page.goto("/worker/orders/mock-order-agenda-001/complete");

    await expect(
      page.getByRole("heading", { name: "Finalizar serviço" }),
    ).toBeVisible();
    await expect(page.getByText("Resumo do serviço")).toBeVisible();
    await expect(page.getByText("Maria Silva")).toBeVisible();
    await expect(page.getByText("R$ 180,00")).toBeVisible();
    await expect(
      page.getByPlaceholder(
        "Informe alguma observação importante sobre a execução do serviço.",
      ),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Concluir serviço" }),
    ).toBeDisabled();
  });

  test("shows the completion history for an already completed service", async ({
    page,
  }) => {
    await page.goto("/worker/orders/mock-order-agenda-006/complete");

    await expect(
      page.getByText("Serviço concluído", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Data e hora da conclusão")).toBeVisible();
    await expect(page.getByText("Prestador responsável")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Concluir serviço" }),
    ).toHaveCount(0);
  });

  test("completes the service with photo evidence and observations", async ({
    page,
  }) => {
    let target: string | undefined;
    for (const orderId of COMPLETION_CANDIDATES) {
      await page.goto(`/worker/orders/${orderId}/complete`);
      if (
        await page
          .getByRole("heading", { name: "Finalizar serviço" })
          .isVisible()
      ) {
        target = orderId;
        break;
      }
    }
    expect(target).toBeDefined();

    const concludeButton = page.getByRole("button", {
      name: "Concluir serviço",
    });
    await expect(concludeButton).toBeDisabled();

    await page
      .locator('[data-slot="completion-gallery-input"]')
      .setInputFiles(FIXTURE_PHOTO);

    await expect(page.getByText("1/10 fotos adicionadas")).toBeVisible();
    await expect(concludeButton).toBeEnabled();

    await page
      .getByPlaceholder(
        "Informe alguma observação importante sobre a execução do serviço.",
      )
      .fill("Serviço executado conforme contratado.");

    await concludeButton.click();

    await expect(
      page.getByRole("heading", { name: "Confirmar conclusão?" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Confirmar conclusão" })
      .click();

    await expect(page.getByText("Serviço concluído!")).toBeVisible();

    await page.getByRole("button", { name: "Ver serviço" }).click();
    await expect(
      page.getByText("Serviço concluído", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Serviço executado conforme contratado."),
    ).toBeVisible();
  });
});
