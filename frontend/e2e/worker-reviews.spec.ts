// Worker reviews E2E — own reviews, reply, and report in mock mode

import { test, expect } from "@playwright/test";

import { loginAsWorkerMock } from "./helpers/auth";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/e2e/reset");
  await loginAsWorkerMock(page);
  await page.goto("/worker/profile");
  await page.getByRole("tab", { name: "Avaliações" }).click();
});

test("worker sees own reviews summary and list", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Minhas avaliações" }),
  ).toBeVisible();
  await expect(
    page.getByText("Prestador muito profissional, pontual e cuidadoso."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Responder" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Denunciar" }).first(),
  ).toBeVisible();
});

test("worker replies to a review", async ({ page }) => {
  await page.getByPlaceholder("Escreva sua resposta…").first().fill("Obrigado!");
  await page.getByRole("button", { name: "Responder" }).first().click();

  await expect(page.getByText("Obrigado!").first()).toBeVisible();
});

test("worker reports an abusive review", async ({ page }) => {
  await page.getByRole("button", { name: "Denunciar" }).first().click();
  await page.getByRole("radio", { name: /baixo calão/i }).click();
  await page.getByPlaceholder(/detalhes/i).fill("Contém palavrões.");
  await page.getByRole("button", { name: "Enviar denúncia" }).click();

  await expect(page.getByText(/denúncia enviada/i)).toBeVisible();
});

test("pending report disables a new report", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: "Denúncia em análise" }),
  ).toBeDisabled();
});
