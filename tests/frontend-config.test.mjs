import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const apps = ["admin", "auth", "devtools", "media", "paperwork", "platform"];
const stylesheets = {
  admin: "apps/admin/src/app/styles.css",
  auth: "apps/auth/src/app/styles.css",
  devtools: "apps/devtools/src/index.css",
  media: "apps/media/app/styles.css",
  paperwork: "apps/paperwork/src/index.css",
  platform: "apps/platform/src/app/styles.css",
};

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

async function readText(path) {
  return readFile(new URL(path, root), "utf8");
}

test("frontend applications share configuration and theme baselines", async () => {
  const [sharedNext, sharedPostcss, sharedTypescript, uiPackage, theme] =
    await Promise.all([
      readText("next.config.shared.mjs"),
      readText("postcss.config.mjs"),
      readJson("tsconfig.base.json"),
      readJson("packages/ui/package.json"),
      readText("packages/ui/src/theme.css"),
    ]);

  assert.match(sharedNext, /reactStrictMode:\s*true/);
  assert.match(sharedNext, /outputFileTracingRoot/);
  assert.match(sharedPostcss, /["']@tailwindcss\/postcss["']/);
  assert.equal(sharedTypescript.compilerOptions.strict, true);
  assert.equal(uiPackage.exports["./theme.css"], "./src/theme.css");
  assert.match(theme, /@source\s+["']\.["'];/);
  assert.match(theme, /@theme\s*\{/);

  const baselinePackage = await readJson("apps/paperwork/package.json");
  const sharedVersions = {
    next: baselinePackage.dependencies.next,
    react: baselinePackage.dependencies.react,
    reactDom: baselinePackage.dependencies["react-dom"],
    tailwind: baselinePackage.devDependencies.tailwindcss,
    tailwindPostcss: baselinePackage.devDependencies["@tailwindcss/postcss"],
    postcss: baselinePackage.devDependencies.postcss,
    typescript: baselinePackage.devDependencies.typescript,
  };

  for (const [dependency, version] of Object.entries(sharedVersions)) {
    assert.equal(typeof version, "string", `${dependency} baseline is missing`);
  }

  for (const app of apps) {
    const [packageJson, nextConfig, postcssConfig, tsconfig, stylesheet] =
      await Promise.all([
        readJson(`apps/${app}/package.json`),
        readText(`apps/${app}/next.config.ts`),
        readText(`apps/${app}/postcss.config.mjs`),
        readJson(`apps/${app}/tsconfig.json`),
        readText(stylesheets[app]),
      ]);

    assert.equal(packageJson.dependencies["@smarttools/ui"], "workspace:*");
    assert.equal(packageJson.dependencies.next, sharedVersions.next);
    assert.equal(packageJson.dependencies.react, sharedVersions.react);
    assert.equal(packageJson.dependencies["react-dom"], sharedVersions.reactDom);
    assert.equal(packageJson.devDependencies.tailwindcss, sharedVersions.tailwind);
    assert.equal(
      packageJson.devDependencies["@tailwindcss/postcss"],
      sharedVersions.tailwindPostcss,
    );
    assert.equal(packageJson.devDependencies.postcss, sharedVersions.postcss);
    assert.equal(packageJson.devDependencies.typescript, sharedVersions.typescript);

    assert.match(nextConfig, /from\s+["']\.\.\/\.\.\/next\.config\.shared\.mjs["']/);
    assert.match(nextConfig, /sharedNextConfig/);
    assert.doesNotMatch(nextConfig, /fileURLToPath/);
    assert.equal(
      postcssConfig.trim(),
      'export { default } from "../../postcss.config.mjs";',
    );
    assert.equal(tsconfig.extends, "../../tsconfig.base.json");

    const allowedCompilerOverrides =
      app === "paperwork" ? ["paths", "strict"] : app === "devtools" ? ["paths"] : [];
    assert.deepEqual(
      Object.keys(tsconfig.compilerOptions ?? {}).sort(),
      allowedCompilerOverrides,
      `${app} should contain only genuine TypeScript exceptions`,
    );

    assert.match(
      stylesheet,
      /^@import "tailwindcss";\n@import "@smarttools\/ui\/theme\.css";/,
    );
    assert.doesNotMatch(stylesheet, /@theme\s*\{/);
  }
});

test("Media URL configuration is wired through local apps and browser tests", async () => {
  const [
    platformEnvironment,
    authEnvironment,
    platformPage,
    authPage,
    adminTools,
    devtoolsPage,
    devtoolsRuntime,
    playwright,
    readme,
  ] =
    await Promise.all([
      readText("apps/platform/.env.example"),
      readText("apps/auth/.env.example"),
      readText("apps/platform/src/app/page.tsx"),
      readText("apps/auth/src/app/page.tsx"),
      readText("apps/admin/src/app/(admin)/tools/_components/ToolList.tsx"),
      readText("apps/devtools/src/app/page.tsx"),
      readText("apps/devtools/src/lib/format-json.ts"),
      readText("playwright.config.ts"),
      readText("README.md"),
    ]);

  for (const source of [platformEnvironment, authEnvironment, platformPage, authPage]) {
    assert.match(source, /MEDIA_URL/);
    assert.match(source, /http:\/\/localhost:3005/);
  }
  assert.match(
    authEnvironment,
    /AUTH_TRUSTED_ORIGINS=[^\n]*http:\/\/localhost:3005/,
  );
  assert.match(playwright, /MEDIA_URL:\s*["']http:\/\/localhost:3005["']/);
  assert.match(playwright, /@smarttools\/media dev/);
  assert.match(platformPage, /name:\s*["']Media Tools["']/);
  assert.match(adminTools, /app:\s*["']media["']/);
  assert.match(devtoolsPage, /Web & Markup Tools/);
  assert.match(devtoolsRuntime, /Web & Markup Tools/);
  assert.doesNotMatch(devtoolsPage, /PDF & Document Tools/);
  assert.doesNotMatch(devtoolsRuntime, /PDF & Document Tools/);
  assert.match(readme, /apps\/media/);
  assert.match(readme, /pnpm dev:media/);
  assert.match(readme, /pnpm test:media/);
});

test("Media HEIC dependency and corresponding-source notice stay in sync", async () => {
  const [packageJson, notice] = await Promise.all([
    readJson("apps/media/package.json"),
    readText("apps/media/public/licenses/heic-to-NOTICE.txt"),
  ]);
  const version = packageJson.dependencies["heic-to"];

  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.match(notice, new RegExp(`heic-to ${version.replaceAll(".", "\\.")}`));
  assert.match(
    notice,
    new RegExp(`heic-to-${version.replaceAll(".", "\\.")}\\.tgz`),
  );
  assert.match(notice, new RegExp(`/tree/v${version.replaceAll(".", "\\.")}`));
});
