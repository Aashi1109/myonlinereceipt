import { expect, test } from "@playwright/test";

test("JSON Viewer matches the approved split-workbench flow", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:3000",
  });
  await page.goto("http://localhost:3000/devtools/json-viewer");

  const workbench = page.getByTestId("tool-workspace");
  const toolbar = workbench.getByTestId("tool-action-toolbar");
  const input = workbench.getByRole("textbox", { name: "JSON input" });
  const tree = workbench.getByTestId("json-result-renderer");
  const repair = toolbar.getByRole("button", { name: "Repair & clean" });

  await expect(workbench).toHaveAttribute("data-definition-key", "json-viewer");
  expect(
    await workbench.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
  ).toBe(await page.evaluate(() => window.innerHeight - 72));
  if ((page.viewportSize()?.width ?? 0) <= 1024) {
    const split = workbench.locator('[data-stack="split"]');
    expect(
      await split.evaluate((element) => ({
        clientHeight: element.clientHeight,
        overflowY: getComputedStyle(element).overflowY,
        scrollHeight: element.scrollHeight,
      })),
    ).toMatchObject({
      overflowY: "auto",
    });
    expect(await split.evaluate((element) => element.scrollHeight)).toBeGreaterThan(
      await split.evaluate((element) => element.clientHeight),
    );
  }
  await expect(page.getByText("JSON TOOL", { exact: true })).toBeVisible();
  await expect(page.getByText("REPAIR & CLEAN", { exact: true })).toBeVisible();
  await expect(page.getByText("PRIVATE IN BROWSER", { exact: true })).toBeVisible();
  await expect(page.getByTestId("tool-workbench-rail")).toHaveCount(0);
  await expect(input).toHaveCSS("font-family", /Geist Mono/);

  for (const action of [
    "Repair & clean",
    "Beautify",
    "Minify",
    "Load example",
    "Load broken example",
    "Clear",
  ]) {
    await expect(toolbar.getByRole("button", { name: action })).toBeVisible();
  }
  await expect(
    toolbar.getByRole("combobox", { name: "Repair strategy" }),
  ).toBeVisible();
  await expect(input).toHaveValue(/CodeUtilityKit/);
  await expect(tree).toContainText("CodeUtilityKit");
  await expect(tree.getByRole("searchbox", { name: "Search JSON result" })).toBeVisible();
  await expect(
    tree.getByRole("button", { name: "Copy JSON result" }),
  ).toBeVisible();
  await expect(
    tree.getByRole("button", { name: "Download JSON result" }),
  ).toBeVisible();
  const rootNode = tree.getByRole("treeitem", { name: "root" });
  const nameNode = tree.getByRole("treeitem", { name: "name" });
  await expect(rootNode).toHaveAttribute("aria-selected", "true");
  await nameNode.click();
  await expect(nameNode).toHaveAttribute("aria-selected", "true");
  await expect(rootNode).toHaveAttribute("aria-selected", "false");

  const support = page.getByTestId("tool-support");
  await expect(support).toContainText("Know the boundaries");
  await expect(support).toContainText("Your data stays local");
  await expect(support).toContainText("Complete the task safely");
  await expect(support).toContainText("Continue with a related tool");
  expect(
    await support
      .getByRole("navigation", { name: "Related JSON tools" })
      .locator("..")
      .evaluate((element) => ({
        borderBottomWidth: getComputedStyle(element).borderBottomWidth,
        borderTopWidth: getComputedStyle(element).borderTopWidth,
      })),
  ).toEqual({
    borderBottomWidth: "0px",
    borderTopWidth: "0px",
  });

  await input.fill('{"name":}');
  await expect(workbench.getByRole("status")).toContainText(
    "isn't valid",
  );
  await workbench.getByRole("button", { name: "Go to error" }).click();
  expect(
    await input.evaluate(
      (element: HTMLTextAreaElement) => element.selectionEnd,
    ),
  ).toBeGreaterThan(
    await input.evaluate(
      (element: HTMLTextAreaElement) => element.selectionStart,
    ),
  );

  await toolbar.getByRole("button", { name: "Load broken example" }).click();
  const brokenInput =
    '[{"id":1,"name":"Alice","age":},{"id":2,"name":"Bob","age":30}]';
  await repair.click();
  const confirmation = workbench.getByTestId("tool-confirmation-overlay");
  await expect(confirmation).toContainText("Confirm destructive repair");
  await expect(confirmation).toContainText("Removed: $[0].age");
  await expect(input).toHaveValue(brokenInput);
  await expect(confirmation).toHaveAttribute("role", "dialog");
  await expect(confirmation).toHaveAttribute("aria-modal", "true");
  const cancelRepair = confirmation.getByRole("button", { name: "Cancel" });
  const applyRepair = confirmation.getByRole("button", {
    name: "Apply repair",
  });
  await expect(cancelRepair).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(applyRepair).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(cancelRepair).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirmation).toHaveCount(0);
  await expect(repair).toBeFocused();
  await expect(workbench.getByRole("status")).toContainText(
    "Action cancelled. Your input was not changed.",
  );

  const repairStrategy = toolbar.getByRole("combobox", {
    name: "Repair strategy",
  });
  await repairStrategy.click();
  await page.getByRole("option", { name: "Set to null" }).click();
  await repairStrategy.click();
  await page.getByRole("option", { name: "Remove broken" }).click();
  await repair.click();
  await confirmation.getByRole("button", { name: "Apply repair" }).click();
  await tree.getByRole("button", { name: "Expand all" }).click();
  await expect(tree).toContainText("Alice");
  await expect(workbench.getByRole("status")).toContainText(
    "JSON repaired. Removed 1 path.",
  );

  await toolbar.getByRole("button", { name: "Minify" }).click();
  const minifiedInput =
    '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob","age":30}]';
  await expect(input).toHaveValue(minifiedInput);
  await tree.getByRole("button", { name: "Copy JSON result" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(minifiedInput);

  const downloadPromise = page.waitForEvent("download");
  await tree.getByRole("button", { name: "Download JSON result" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "smarttools-json-viewer.json",
  );

  await toolbar.getByRole("button", { name: "Clear" }).click();
  await expect(input).toHaveValue("");
  await workbench.getByRole("button", { name: "Undo" }).click();
  await expect(input).toHaveValue(minifiedInput);

  await expect(
    toolbar.getByRole("group", { name: "Viewer layout" }),
  ).toHaveCount(0);
  await expect(tree).toBeVisible();

  expect(
    await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    })),
  ).toEqual({
    clientWidth: await page.evaluate(
      () => document.documentElement.clientWidth,
    ),
    scrollWidth: await page.evaluate(
      () => document.documentElement.clientWidth,
    ),
  });
});
