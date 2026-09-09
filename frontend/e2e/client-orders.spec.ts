import { expect, test } from "@playwright/test";

import { loginAsClientMock } from "./helpers/auth";

test.describe("Client requests (JTT-79)", () => {
  // Shared mutable mock: accept/reject must run in sequence.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsClientMock(page);
  });

  test("lists the client requests", async ({ page }) => {
    await page.goto("/client/orders");

    await expect(
      page.getByRole("heading", { name: "Minhas solicitações" }),
    ).toBeVisible();

    await expect(
      page.getByText("Conserto de vazamento no chuveiro"),
    ).toBeVisible();
    await expect(page.getByText("2 propostas").first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ver propostas" }).first(),
    ).toBeVisible();
  });

  test("opens detail and shows pending proposals", async ({ page }) => {
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

  test("declines a pending proposal", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-001");

    // Segunda proposta (R$ 220,00)
    await page.getByRole("button", { name: "Recusar" }).nth(1).click();
    await page.getByRole("button", { name: "Confirmar recusa" }).click();

    await expect(page.getByText("Proposta recusada.")).toBeVisible();
    await expect(page.getByText("Recusada", { exact: true })).toBeVisible();
    await expect(page.getByText("R$ 220,00")).toBeVisible();
  });

  test("accepts a pending proposal and redirects to checkout", async ({
    page,
  }) => {
    await page.goto("/client/orders/mock-client-order-001");

    await page.getByRole("button", { name: "Aceitar" }).first().click();
    await page.getByRole("button", { name: "Confirmar aceite" }).click();

    await expect(page.getByText("Proposta aceita com sucesso!")).toBeVisible();
    await expect(page).toHaveURL(
      /\/client\/orders\/mock-client-order-001\/checkout/,
    );
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("R$ 180,00")).toBeVisible();
  });
});

