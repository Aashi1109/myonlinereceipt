import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const apps = ["admin", "auth", "devtools", "paperwork", "platform"];
const stylesheets = {
  admin: "apps/admin/src/app/styles.css",
  auth: "apps/auth/src/app/styles.css",
  devtools: "apps/devtools/src/index.css",
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
