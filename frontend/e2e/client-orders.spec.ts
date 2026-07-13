import { expect, test } from "@playwright/test";

import { loginAsClientMock } from "./helpers/auth";

test.describe("Solicitações do cliente (JTT-82)", () => {
  // Mock mutável compartilhado: accept/reject precisam rodar em sequência.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsClientMock(page);
  });

  test("lista solicitações do cliente", async ({ page }) => {
    await page.goto("/client/orders");

    await expect(
      page.getByRole("heading", { name: "Minhas solicitações" }),
    ).toBeVisible();

    await expect(
      page.getByText("Conserto de vazamento no chuveiro"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ver propostas" }).first(),
    ).toBeVisible();
  });

  test("abre detalhe e mostra propostas pendentes", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-001");

    await expect(
      page.getByRole("heading", { name: "Conserto de vazamento no chuveiro" }),
    ).toBeVisible();
    await expect(page.getByText("Hidráulica")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Propostas recebidas" }),
    ).toBeVisible();
    await expect(page.getByText("R$ 180,00")).toBeVisible();
    await expect(
      page.getByText(
        "Posso realizar o reparo ainda esta semana, com garantia de 90 dias.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Aceitar" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Recusar" }).first(),
    ).toBeVisible();
  });

  test("recusa proposta pendente", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-001");

    // Segunda proposta (R$ 220,00)
    await page.getByRole("button", { name: "Recusar" }).nth(1).click();
    await page.getByRole("button", { name: "Confirmar recusa" }).click();

    await expect(page.getByText("Proposta recusada.")).toBeVisible();
    await expect(page.getByText("Recusada", { exact: true })).toBeVisible();
    await expect(page.getByText("R$ 220,00")).toBeVisible();
  });

  test("aceita proposta pendente e atualiza status", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-001");

    await page.getByRole("button", { name: "Aceitar" }).first().click();
    await page.getByRole("button", { name: "Confirmar aceite" }).click();

    await expect(page.getByText("Proposta aceita com sucesso!")).toBeVisible();
    await expect(page.getByText("Aceita", { exact: true })).toBeVisible();
    await expect(page.getByText("Em andamento").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Aceitar" })).toHaveCount(0);
  });
});
