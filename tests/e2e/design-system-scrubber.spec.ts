import { expect, test, type Locator } from "@playwright/test";
import { E2E_ACCOUNTS, E2E_PASSWORD } from "./fixtures/accounts";
import { AuthPage } from "./pages/AuthPage";

async function tickWidths(scrubber: Locator) {
  return scrubber.getByRole("option").evaluateAll((options) =>
    options.map((option) => {
      const tick = option.querySelector("span");
      return tick ? tick.getBoundingClientRect().width : 0;
    }),
  );
}

async function expectWaveWidths(
  scrubber: Locator,
  {
    centerIndex,
    hoverLengthMultiplier,
    radius,
    restLength,
  }: {
    centerIndex: number;
    hoverLengthMultiplier: number;
    radius: number;
    restLength: number;
  },
) {
  const peakLength = restLength * hoverLengthMultiplier;
  await expect
    .poll(async () => Math.max(...(await tickWidths(scrubber))))
    .toBeGreaterThan(peakLength - 1);

  const widths = await tickWidths(scrubber);
  widths.forEach((width, index) => {
    const distance = Math.abs(index - centerIndex);
    const standardDeviation = radius / 2.25;
    const wave =
      distance >= radius
        ? 0
        : Math.exp(-0.5 * (distance / standardDeviation) ** 2);
    const expectedWidth = restLength + wave * (peakLength - restLength);
    expect(width).toBeCloseTo(expectedWidth, 1);
  });
}

test("shared scrubbers render their wave and preview at runtime", async ({
  page,
}) => {
  await new AuthPage(page).signIn(
    E2E_ACCOUNTS.admin.email,
    E2E_PASSWORD,
    "http://localhost:3000/admin/design-system",
  );

  const sharedScrubber = page.getByRole("listbox", {
    name: "Tool workflow chapters",
  });
  const sharedTarget = sharedScrubber.getByRole("option", {
    name: "Validate inputs. Resolve any unsupported files or missing requirements.",
  });

  await expect(sharedScrubber).toBeVisible();
  const restingWidths = await tickWidths(sharedScrubber);
  restingWidths.forEach((width) => expect(width).toBeCloseTo(14, 1));

  await sharedTarget.hover();

  await expectWaveWidths(sharedScrubber, {
    centerIndex: 3,
    hoverLengthMultiplier: 52 / 14,
    radius: 4.5,
    restLength: 14,
  });
  await expect(sharedTarget.locator("span")).toHaveCSS(
    "background-color",
    "rgb(26, 26, 26)",
  );
  await expect(sharedTarget.locator("span")).toHaveCSS("height", "2px");
  const sharedPreview = sharedScrubber
    .locator("xpath=..")
    .locator(":scope > div")
    .last();
  await expect(sharedPreview).toHaveCSS("opacity", "1");
  await expect(sharedPreview).toContainText("Validate inputs");

  const pageScrubber = page.getByRole("listbox", { name: "Page scrubber" });
  const pageTarget = pageScrubber.getByRole("option", { name: "Page 10" });

  await expect(pageScrubber).toBeVisible();
  await pageTarget.hover();

  await expectWaveWidths(pageScrubber, {
    centerIndex: 9,
    hoverLengthMultiplier: 2.5,
    radius: 4.5,
    restLength: 8,
  });
  await expect(pageTarget.locator("span")).toHaveCSS("height", "2px");

  const pagePreview = pageScrubber
    .locator("xpath=..")
    .locator(":scope > div")
    .last();
  await expect(pagePreview).toHaveCSS("opacity", "1");
  await expect(pagePreview).toHaveCSS("width", "178px");
  await expect(pagePreview).toContainText("Page 10 · Review & approve");
});
