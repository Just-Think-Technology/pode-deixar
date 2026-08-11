import { expect, test } from "@playwright/test";

import { loginAsWorkerMock } from "./helpers/auth";

test.describe("Confirmação de pagamento do prestador (JTT-93)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsWorkerMock(page);
  });

  test("expande status do pagamento na proposta aceita e mostra PAID", async ({
    page,
  }) => {
    await page.goto("/worker/proposal/mock-proposal-002");

    await expect(
      page.getByRole("heading", { name: "Detalhe da proposta" }),
    ).toBeVisible();
    await expect(page.getByText("Aceita", { exact: true })).toBeVisible();
    await expect(page.getByText("R$ 350,00")).toBeVisible();

    await page.getByRole("button", { name: /Status do pagamento/ }).click();

    await expect(
      page.getByText("Pagamento confirmado", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Pago", { exact: true })).toBeVisible();
    await expect(page.getByText(/O cliente pagou/)).toBeVisible();
    await expect(page.getByText(/via Pix/)).toBeVisible();
  });

  test("proposta pendente não mostra seção de pagamento", async ({ page }) => {
    await page.goto("/worker/proposal/mock-proposal-001");

    await expect(
      page.getByRole("heading", { name: "Detalhe da proposta" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Status do pagamento/ }),
    ).toHaveCount(0);
  });
});
