import { expect, test } from "@playwright/test";

import { loginAsWorkerMock } from "./helpers/auth";

test.describe("Agenda do prestador (JTT-94)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsWorkerMock(page);
  });

  test("exibe a agenda semanal com serviços pagos", async ({ page }) => {
    await page.goto("/worker/agenda");

    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
    await expect(page.locator('[data-slot="agenda-week-view"]')).toBeVisible();
    await expect(
      page
        .locator('[data-slot="agenda-week-view"]')
        .getByText("Instalação de torneira"),
    ).toBeVisible();
  });

  test("abre o detalhe do agendamento com Maps e fotos em tela cheia", async ({
    page,
  }) => {
    await page.goto("/worker/agenda");

    await page
      .getByRole("button", { name: /Instalação de torneira/ })
      .first()
      .click();

    await expect(
      page.getByRole("heading", { name: "Instalação de torneira" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Troca da torneira da pia da cozinha e verificação de vazamentos na conexão.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Abrir no Google Maps" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Ampliar foto 1/ }).click();

    await expect(
      page.locator('[data-slot="agenda-photo-lightbox"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /foto 1 de 2/ }),
    ).toBeVisible();
  });

  test("filtra pelo dia no mini calendário e restaura a semana no segundo clique", async ({
    page,
  }) => {
    await page.goto("/worker/agenda");

    const miniCalendar = page.locator('[data-slot="agenda-mini-calendar"]');
    await expect(miniCalendar).toBeVisible();

    await miniCalendar.getByRole("button", { name: /^Hoje,/ }).click();

    await expect(page.locator('[data-slot="agenda-day-list"]')).toBeVisible();
    await expect(page.locator('[data-slot="agenda-week-view"]')).toHaveCount(0);
    await expect(page).toHaveURL(/dia=\d{4}-\d{2}-\d{2}/);

    await miniCalendar.getByRole("button", { name: /^Hoje,/ }).click();

    await expect(page.locator('[data-slot="agenda-week-view"]')).toBeVisible();
    await expect(page.locator('[data-slot="agenda-day-list"]')).toHaveCount(0);
    await expect(page).not.toHaveURL(/dia=/);
  });
});
