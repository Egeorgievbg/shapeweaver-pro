import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(process.env.DEMO_PREVIEW_OUTPUT ?? "artifacts/sqlite-demo-preview");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function capture(name: string, path: string, mobile = false) {
  const context = await browser.newContext(
    mobile
      ? { ...devices["Pixel 7"], locale: "bg-BG", colorScheme: "dark" }
      : { viewport: { width: 1440, height: 1000 }, locale: "bg-BG", colorScheme: "dark" },
  );
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`http://127.0.0.1:4173${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(path.includes("studio") ? 3500 : 1500);
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  await Bun.write(`${output}/${name}.json`, JSON.stringify({ path, errors }, null, 2));
  await context.close();
}

await capture("desktop-landing", "/");
await capture("desktop-library", "/library");
await capture("desktop-studio-3d", "/studio/mailer-001");
await capture("desktop-studio-rigid", "/studio/rigid-001");
await capture("mobile-library", "/library", true);
await capture("mobile-studio", "/studio/mailer-001", true);
await browser.close();
