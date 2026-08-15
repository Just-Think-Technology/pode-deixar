import { expect, test } from "@playwright/test";

import { loginAsWorkerMock } from "./helpers/auth";

test.describe("Financeiro do prestador (JTT-95)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsWorkerMock(page);
  });

  test("mostra cards, gráficos e linha com bruto/taxa/líquido", async ({
    page,
  }) => {
    await page.goto("/worker/finance");

    await expect(
      page.getByRole("heading", { name: "Financeiro" }),
    ).toBeVisible();

    await expect(page.getByText("A receber", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Aguardando pagamento", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Já recebido (mês)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Taxas retidas (mês)", { exact: true }),
    ).toBeVisible();

    await expect(page.getByText("Evolução mensal", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Composição do financeiro", { exact: true }),
    ).toBeVisible();

    const paidCard = page
      .locator("li")
      .filter({ hasText: "R$ 315,00" })
      .filter({ hasText: "Pago pelo cliente" });

    await expect(paidCard.getByText("Bruto")).toBeVisible();
    await expect(paidCard.getByText("R$ 350,00")).toBeVisible();
    await expect(paidCard.getByText("R$ 35,00")).toBeVisible();
    await expect(paidCard.getByText("R$ 315,00").first()).toBeVisible();

    await paidCard.getByRole("link", { name: "Ver proposta" }).click();
    await expect(page).toHaveURL(/\/worker\/proposal\/mock-proposal-002/);
    await expect(
      page.getByRole("heading", { name: "Detalhe da proposta" }),
    ).toBeVisible();
  });

  test("filtra lançamentos por status Pago", async ({ page }) => {
    await page.goto("/worker/finance");

    await expect(
      page.getByRole("heading", { name: "Por proposta" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Pago" }).click();

    const list = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Por proposta" }),
    });

    await expect(list.getByText("R$ 315,00").first()).toBeVisible();
    await expect(
      list.getByText("Aguardando pagamento", { exact: true }),
    ).toHaveCount(0);
  });

  test("menu do painel leva à tela Financeiro", async ({ page }) => {
    await page.goto("/worker/dashboard");

    await page.getByRole("link", { name: "Financeiro" }).click();
    await expect(page).toHaveURL(/\/worker\/finance/);
    await expect(
      page.getByRole("heading", { name: "Financeiro" }),
    ).toBeVisible();
  });

  test("rota antiga /worker/payments redireciona para Financeiro", async ({
    page,
  }) => {
    await page.goto("/worker/payments");
    await expect(page).toHaveURL(/\/worker\/finance/);
    await expect(
      page.getByRole("heading", { name: "Financeiro" }),
    ).toBeVisible();
  });
});
