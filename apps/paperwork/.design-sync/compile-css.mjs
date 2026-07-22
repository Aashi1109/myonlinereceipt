import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFileSync, writeFileSync } from "node:fs";
const input = readFileSync("src/index.css", "utf8");
const res = await postcss([tailwind()]).process(input, { from: "src/index.css", to: ".design-sync/tailwind.css" });
// Inter is referenced by the @theme --font-sans token but no @font-face ships;
// load it from the font host so the DS pane renders on-brand (not system-ui).
const INTER = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');\n";
writeFileSync(".design-sync/tailwind.css", INTER + res.css);
console.log("wrote .design-sync/tailwind.css", res.css.length, "bytes");
