import { expect, test } from "@playwright/test";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "./fixtures/accounts";
import { AuthPage } from "./pages/AuthPage";

test("an Admin publishes a template that Paperwork can consume", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "mutation runs once");
  const suffix = Date.now().toString(36);
  const name = `E2E Published ${suffix}`;

  await new AuthPage(page).signIn(
    E2E_ACCOUNTS.admin.email,
    E2E_PASSWORD,
    "http://localhost:3003/templates",
  );
  const create = page.locator("section").filter({ hasText: "Create template" });
  await create.getByLabel("Name").fill(name);
  await create.getByLabel("Slug").fill(`e2e-published-${suffix}`);
  await create.getByLabel("Description").fill(
    "Published by the desktop browser integration test.",
  );
  await create.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/templates\/[a-f0-9-]+$/);

  await page.goto("http://localhost:3003/templates");
  const card = page.locator("article").filter({ hasText: name });
  await card.getByRole("button", { name: "Publish" }).click();
  await expect(card).toContainText("published");
  await card.getByRole("button", { name: "Set default" }).click();
  await expect(card).toContainText("Default");

  await page.goto("http://localhost:3001/invoice-generator");
  await expect(
    page.getByRole("heading", {
      name: `Invoice theme: ${name}`,
      exact: true,
    }),
  ).toBeVisible();
});
