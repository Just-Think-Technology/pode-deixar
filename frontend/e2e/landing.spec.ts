import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("carrega a página inicial com marca e headline", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("img", { name: "Pode-Deixar" }).first()).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Encontre profissionais de confiança para qualquer serviço",
      }),
    ).toBeVisible();
  });
});
