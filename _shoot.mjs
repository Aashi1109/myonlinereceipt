import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const OUT = process.argv[2];
const routes = process.argv.slice(3);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

for (const route of routes) {
  const name = route.replace(/\//g, "_").replace(/^_/, "");
  try {
    await page.goto(`http://localhost:3000${route}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log(`ok   ${route}`);
  } catch (error) {
    console.log(`FAIL ${route} — ${error.message.split("\n")[0]}`);
  }
}

await browser.close();
