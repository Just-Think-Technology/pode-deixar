import { expect, test } from "@playwright/test";

import { loginAsClientMock } from "./helpers/auth";

test.describe("Checkout / payment confirmation (JTT-92)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClientMock(page);
  });

  test("shows checkout for an order with an accepted proposal", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-003/checkout");

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("Pintura de quarto infantil")).toBeVisible();
    await expect(page.getByText("R$ 380,00")).toBeVisible();
    await expect(page.getByText("Agendamento do serviço")).toBeVisible();
    await expect(page.getByLabel("Data")).toBeVisible();
    await expect(page.getByLabel("Horário de início")).toBeVisible();
    await expect(page.getByText("Pix", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar para pagamento" }),
    ).toBeVisible();
  });

  test("generates a PIX charge, simulates payment and confirms PAID", async ({
    page,
  }) => {
    await page.goto("/client/orders/mock-client-order-003/checkout");

    await page.getByLabel("Horário de início").fill("09:00");
    await page.getByLabel("Horário de término (opcional)").fill("10:00");
    await page.getByRole("button", { name: "Continuar para pagamento" }).click();

    await expect(page.getByText("Cobrança gerada")).toBeVisible();
    await expect(page.getByText("Pix copia e cola")).toBeVisible();
    await expect(page.locator("#pix-code")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Simular confirmação de pagamento" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Simular confirmação de pagamento" })
      .click();

    await expect(page).toHaveURL(
      /\/client\/orders\/mock-client-order-003\/checkout\/confirmation\?paymentId=/,
    );
    await expect(
      page.getByRole("heading", { name: "Confirmação de pagamento" }),
    ).toBeVisible();
    await expect(
      page.getByText("Pagamento confirmado", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Pago", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver pedido" })).toBeVisible();
  });

  test("generates a card charge with a mock external link", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-003/checkout");

    await page.getByLabel("Horário de início").fill("09:00");
    await page.getByText("Cartão de crédito").click();
    await page.getByRole("button", { name: "Continuar para pagamento" }).click();

    await expect(
      page.getByRole("link", { name: "Abrir checkout do cartão" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Abrir checkout do cartão" }),
      // Justificativa AppSec: mock usa URL realista do gateway (allowlist exige https + mercadopago.*).
    ).toHaveAttribute("href", /mercadopago\.com\/mock-checkout\//);
  });
});
