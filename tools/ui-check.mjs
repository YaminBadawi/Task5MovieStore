import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, "../output");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });

await page.goto("http://127.0.0.1:4175", { waitUntil: "networkidle" });
await page.locator("#movieTableBody .movieRow").first().waitFor();
if (await page.locator("#movieTableBody .movieRow").count() !== 12) throw new Error("Table did not render twelve films.");
await page.locator("#movieTableBody .rowToggle").first().click();
await page.screenshot({ path: path.join(output, "table.png"), fullPage: true });

await page.locator("#galleryViewButton").click();
await page.locator(".galleryCard").first().waitFor();
await page.screenshot({ path: path.join(output, "gallery.png"), fullPage: false });

await page.locator(".galleryPoster").first().click();
await page.locator("#trailerDialog").waitFor({ state: "visible" });
await page.locator("#playTrailerButton").click();
await page.waitForTimeout(1300);
await page.screenshot({ path: path.join(output, "trailer.png"), fullPage: false });

await browser.close();
console.log("UI checks and screenshots completed.");
