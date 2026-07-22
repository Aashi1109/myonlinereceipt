import { expect, test } from "@playwright/test";

test("anonymous visitors can discover and use the public tools", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(
    page.getByRole("heading", { name: "Choose the project that fits the job." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("http://localhost:3001");
  await expect(
    page.getByRole("heading", { name: "Choose the paperwork tool for the job." }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Invoice Generator/ }).click();
  await expect(page).toHaveURL("http://localhost:3001/invoice-generator");
  await expect(
    page.getByRole("heading", {
      name: "Free Invoice Generator for Contractors & Small Businesses",
    }),
  ).toBeVisible();

  await page.goto("http://localhost:3002/json-formatter");
  await page.getByRole("button", { name: "Clear JSON input" }).click();
  await page
    .getByRole("textbox", { name: "JSON input", exact: true })
    .fill('{"ready":true}');
  await page.getByRole("button", { name: "Validate" }).click();
  await expect(page.getByRole("status")).toContainText("JSON is valid.");
});

test("invoice workflow exposes protected actions and supporting content", async ({
  page,
}, testInfo) => {
  await page.goto("http://localhost:3001/invoice-generator");

  await expect(
    page.getByRole("heading", { name: "Frequently Asked Questions" }),
  ).toBeVisible();
  await expect(
    page.locator("#related-tools-block").getByRole("link", {
      name: /Invoice Generator/,
    }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: /Join Waiting List/ }).click();
  const waitlist = page.getByRole("dialog", { name: "Join the Paperwork Pro waitlist" });
  await expect(waitlist).toBeVisible();
  await waitlist.getByLabel("Email address").fill("owner@example.com");
  await waitlist.getByRole("button", { name: "Join waiting list" }).click();
  await expect(page.getByRole("status")).toContainText("interest saved in this browser");

  await page.getByRole("button", { name: "Load sample" }).click();
  const sampleConfirmation = page.getByRole("dialog", {
    name: "Load sample invoice?",
  });
  await expect(sampleConfirmation).toBeVisible();
  await sampleConfirmation.getByRole("button", { name: "Load sample invoice" }).click();
  await expect(page.getByRole("status")).toContainText("Sample invoice loaded");

  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const clearConfirmation = page.getByRole("dialog", {
    name: "Clear this invoice draft?",
  });
  await expect(clearConfirmation).toBeVisible();
  await clearConfirmation.getByRole("button", { name: "Clear invoice draft" }).click();
  await expect(page.getByRole("status")).toContainText("Invoice draft cleared");
  await page.getByRole("button", { name: "Download PDF" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "highlighted fields before exporting" }),
  ).toBeVisible();

  if (testInfo.project.name.includes("mobile")) {
    await expect(page.getByRole("tab", { name: "Edit details" })).toBeVisible();
    await page.getByRole("tab", { name: "Live preview" }).click();
    await expect(page.locator("#preview-panel")).toBeVisible();
    await expect(page.locator("#mobile-invoice-actions")).toBeVisible();
  }
});
