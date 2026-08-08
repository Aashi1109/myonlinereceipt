import { expect, test } from "@playwright/test";

test("JSON Viewer matches the approved split-workbench flow", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:3000",
  });
  await page.addInitScript(() => {
    window.localStorage.removeItem("smarttools:json-viewer:split-size");
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
  } else {
    const separator = workbench.getByRole("separator", {
      name: "Resize workspace panels",
    });
    const collapsePrimary = workbench.getByRole("button", {
      name: "Collapse primary panel",
    });
    const primaryPane = workbench.locator('[data-split-pane="primary"]');
    await expect(separator).toHaveAttribute("aria-valuenow", "42");
    await expect(collapsePrimary).toBeVisible();
    const initialWidth = await primaryPane.evaluate(
      (element) => element.getBoundingClientRect().width,
    );

    await separator.focus();
    await page.keyboard.press("ArrowRight");
    expect(
      await primaryPane.evaluate(
        (element) => element.getBoundingClientRect().width,
      ),
    ).toBeGreaterThan(initialWidth);

    await collapsePrimary.click();
    await expect(primaryPane).toBeHidden();
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(primaryPane).toBeVisible();
    await page.setViewportSize({ height: 720, width: 1280 });
    await expect(primaryPane).toBeVisible();
  }
  await expect(
    workbench.locator('[data-purpose="editor"]'),
  ).toHaveAttribute("data-state", "ready");
  await expect(
    workbench.locator('[data-purpose="inspector"]'),
  ).toHaveAttribute("data-state", "ready");
  await expect(page.getByText("JSON TOOL", { exact: true })).toBeVisible();
  await expect(page.getByText("REPAIR & CLEAN", { exact: true })).toBeVisible();
  await expect(page.getByText("PRIVATE IN BROWSER", { exact: true })).toBeVisible();
  await expect(page.getByTestId("tool-workbench-rail")).toHaveCount(0);
  await expect(input).toHaveCSS("font-family", /Geist Mono/);

  for (const action of [
    "Repair & clean",
    "Beautify",
    "Minify",
    "Example",
    "Broken example",
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
  await expect(workbench.getByTestId("tool-status-line")).toContainText(
    "isn't valid",
  );
  await expect(
    workbench.locator('[data-purpose="editor"] [role="alert"]'),
  ).toHaveCount(0);
  await workbench
    .getByTestId("json-result-placeholder")
    .getByRole("button", { name: /Go to JSON error at line/i })
    .click();
  expect(
    await input.evaluate(
      (element: HTMLTextAreaElement) => element.selectionEnd,
    ),
  ).toBeGreaterThan(
    await input.evaluate(
      (element: HTMLTextAreaElement) => element.selectionStart,
    ),
  );

  await toolbar.getByRole("button", { name: "Broken example" }).click();
  const brokenInput =
    '[{"id":1,"name":"Alice","age":},{"id":2,"name":"Bob","age":30}]';
  await repair.click();
  const confirmation = workbench.getByTestId("tool-confirmation-overlay");
  await expect(confirmation).toContainText("Confirm destructive repair");
  await expect(confirmation).toContainText("Removed: $[0].age");
  await expect(input).toHaveValue(brokenInput);
  await expect(confirmation).toHaveAttribute("role", "alertdialog");
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
  await expect(
    page.getByText("Repair cancelled. Input was not changed.", { exact: true }),
  ).toBeVisible();

  const repairStrategy = toolbar.getByRole("combobox", {
    name: "Repair strategy",
  });
  await repairStrategy.click();
  await page.getByRole("option", { name: "Set to null" }).click();
  await repairStrategy.click();
  await page.getByRole("option", { name: "Remove broken" }).click();
  await repair.click();
  await confirmation.getByRole("button", { name: "Apply repair" }).click();
  await expect(input).toHaveValue(brokenInput);
  const treeTab = tree.getByRole("tab", { name: "Tree" });
  const formattedTab = tree.getByRole("tab", { name: "Formatted" });
  await expect(formattedTab).toHaveAttribute("aria-selected", "true");
  await expect(tree.getByRole("tabpanel")).toContainText("Alice");
  expect(
    await Promise.all(
      [treeTab, formattedTab].map((tab) =>
        tab.evaluate((element) => ({
          fontWeight: getComputedStyle(element).fontWeight,
          height: element.getBoundingClientRect().height,
        })),
      ),
    ),
  ).toEqual([
    { fontWeight: "600", height: 46 },
    { fontWeight: "600", height: 46 },
  ]);
  await expect(page.getByText(/JSON repaired with the/)).toBeVisible();

  await toolbar.getByRole("button", { name: "Minify" }).click();
  const minifiedInput =
    '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob","age":30}]';
  await expect(input).toHaveValue(brokenInput);
  const formattedPanel = tree.getByRole("tabpanel");
  await expect(formattedPanel).toHaveText(minifiedInput);
  expect(
    await formattedPanel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
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
  await page.getByRole("button", { name: "Undo" }).last().click();
  await expect(input).toHaveValue(brokenInput);

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

test("JSON Formatter uses the shared JSON result controls", async ({ page }) => {
  await page.goto("http://localhost:3000/devtools/json-formatter");
  await page.getByRole("button", { name: "Example" }).click();

  const result = page.getByTestId("json-result-renderer");
  const view = result.getByRole("combobox", { name: "JSON result view" });
  await expect(view).toHaveText(/code/i);
  await expect(result.getByRole("button", { name: "Copy JSON result" })).toBeVisible();
  await expect(result.getByRole("button", { name: "Download JSON result" })).toBeVisible();
  await expect(result.getByRole("group", { name: "Tree expansion controls" })).toHaveCount(0);
  await expect(result.getByRole("group", { name: "JSON edit history" })).toHaveCount(0);

  await view.click();
  await page.getByRole("option", { name: "tree", exact: true }).click();
  await expect(result.getByRole("group", { name: "Tree expansion controls" })).toBeVisible();
  await expect(result.getByRole("group", { name: "JSON edit history" })).toBeVisible();

  await result.getByRole("combobox", { name: "JSON result view" }).click();
  await page.getByRole("option", { name: "form", exact: true }).click();
  await expect(result.getByRole("tree", { name: "JSON value editor" })).toBeVisible();
});
