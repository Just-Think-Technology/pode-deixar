import { expect, test } from "@playwright/test";

import { loginAsClientMock } from "./helpers/auth";

test.describe("Checkout / confirmação de pagamento (JTT-92)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsClientMock(page);
  });

  test("mostra checkout de pedido com proposta aceita", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-003/checkout");

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("Pintura de quarto infantil")).toBeVisible();
    await expect(page.getByText("R$ 380,00")).toBeVisible();
    await expect(page.getByText("Pix", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continuar para pagamento" }),
    ).toBeVisible();
  });

  test("gera cobrança Pix, simula pagamento e confirma PAID", async ({
    page,
  }) => {
    await page.goto("/client/orders/mock-client-order-003/checkout");

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

  test("gera cobrança de cartão com link externo mock", async ({ page }) => {
    await page.goto("/client/orders/mock-client-order-003/checkout");

    await page.getByText("Cartão de crédito").click();
    await page.getByRole("button", { name: "Continuar para pagamento" }).click();

    await expect(
      page.getByRole("link", { name: "Abrir checkout do cartão" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Abrir checkout do cartão" }),
    ).toHaveAttribute("href", /checkout\.mock\.pode-deixar\.com/);
  });
});
