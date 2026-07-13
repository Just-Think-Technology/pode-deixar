import { expect, test } from "@playwright/test";

import { loginAsWorkerMock } from "./helpers/auth";

test.describe("Solicitações do prestador (JTT-83)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsWorkerMock(page);
  });

  test("lista solicitações recebidas", async ({ page }) => {
    await page.goto("/worker/requests");

    await expect(
      page.getByRole("heading", { name: "Solicitações recebidas" }),
    ).toBeVisible();

    await expect(
      page.getByText("Conserto de vazamento no chuveiro"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ver e responder" }).first(),
    ).toBeVisible();
  });

  test("abre detalhe da solicitação", async ({ page }) => {
    await page.goto("/worker/requests/mock-request-001");

    await expect(
      page.getByRole("heading", { name: "Conserto de vazamento no chuveiro" }),
    ).toBeVisible();
    await expect(page.getByText("Hidráulica")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar proposta" }),
    ).toBeVisible();
    await expect(page.getByLabel("Preço (R$)")).toBeVisible();
  });

  test("envia proposta válida e redireciona para propostas", async ({
    page,
  }) => {
    await page.goto("/worker/requests/mock-request-001");

    await page.getByLabel("Preço (R$)").fill("180");
    await page
      .getByLabel("Descrição da proposta")
      .fill(
        "Posso realizar o reparo ainda esta semana, com garantia de 90 dias.",
      );
    await page.getByLabel("Duração estimada (opcional)").fill("2 horas");

    await page.getByRole("button", { name: "Enviar proposta" }).click();

    await expect(page).toHaveURL(/\/worker\/proposal$/);
    await expect(
      page.getByRole("heading", { name: "Minhas propostas" }),
    ).toBeVisible();
  });

  test("proposta inválida mostra erro e permanece na página", async ({
    page,
  }) => {
    await page.goto("/worker/requests/mock-request-001");

    await page.getByLabel("Preço (R$)").fill("");
    await page.getByLabel("Descrição da proposta").fill("curta");
    await page.getByRole("button", { name: "Enviar proposta" }).click();

    await expect(page).toHaveURL(/\/worker\/requests\/mock-request-001$/);
    await expect(
      page.getByText("Informe um preço válido maior que zero"),
    ).toBeVisible();
    await expect(
      page.getByText("Descrição deve ter entre 10 e 2000 caracteres"),
    ).toBeVisible();
  });
});
