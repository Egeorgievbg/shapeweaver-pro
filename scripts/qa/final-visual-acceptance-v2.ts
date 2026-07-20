import { chromium, devices, type BrowserContext, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:4173";
const output = resolve(process.env.QA_OUTPUT ?? "artifacts/final-visual-acceptance");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });

type Profile = "desktop" | "tablet" | "mobile";
type Scenario = {
  name: string;
  path: string;
  profile: Profile;
  wait?: number;
  canvas?: boolean;
  action?: (page: Page) => Promise<void>;
};

type Result = {
  name: string;
  path: string;
  profile: Profile;
  stage: string;
  status?: number;
  errors: string[];
  warnings: string[];
  screenshot?: string;
};

function options(profile: Profile) {
  if (profile === "mobile") return { ...devices["Pixel 7"], locale: "bg-BG", colorScheme: "dark" as const };
  if (profile === "tablet") {
    return { viewport: { width: 1024, height: 1366 }, locale: "bg-BG", colorScheme: "dark" as const };
  }
  return { viewport: { width: 1440, height: 1000 }, locale: "bg-BG", colorScheme: "dark" as const };
}

async function bounded<T>(promise: Promise<T>, label: string, milliseconds = 22_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} exceeded ${milliseconds} ms`)), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function clickAny(page: Page, names: RegExp[]) {
  for (const name of names) {
    const role = page.getByRole("button", { name }).first();
    if (await role.isVisible().catch(() => false)) {
      await role.click();
      return;
    }
    const text = page.getByText(name).first();
    if (await text.isVisible().catch(() => false)) {
      await text.click();
      return;
    }
  }
  throw new Error(`Control not found: ${names.map(String).join(", ")}`);
}

const switch2d = async (page: Page) => {
  await clickAny(page, [/2D.*дилайн/i, /2D.*dieline/i]);
  await page.waitForTimeout(600);
};
const switchSplit = async (page: Page) => {
  await clickAny(page, [/Разделен изглед/i, /Split view/i]);
  await page.waitForTimeout(800);
};
const openExport = async (page: Page) => {
  await clickAny(page, [/^Експорт$/i, /^Export$/i]);
  await page.getByRole("dialog").waitFor({ state: "visible" });
};
const openQuote = async (page: Page) => {
  await clickAny(page, [/Оферта/i, /Request quote/i]);
  await page.getByRole("dialog").waitFor({ state: "visible" });
};
const openTools = async (page: Page) => {
  await clickAny(page, [/Отвори.*инструмент/i, /Open editor tools/i, /^Product$/i]);
  await page.waitForTimeout(400);
};

const scenarios: Scenario[] = [
  { name: "desktop-landing", path: "/", profile: "desktop" },
  { name: "desktop-library", path: "/library", profile: "desktop" },
  { name: "desktop-studio-3d-mailer", path: "/studio/mailer-001", profile: "desktop", wait: 2600, canvas: true },
  { name: "desktop-studio-2d-mailer", path: "/studio/mailer-001", profile: "desktop", wait: 2200, action: switch2d },
  { name: "desktop-studio-split-rigid", path: "/studio/rigid-001", profile: "desktop", wait: 2600, canvas: true, action: switchSplit },
  { name: "desktop-export-dialog", path: "/studio/mailer-001", profile: "desktop", wait: 2300, canvas: true, action: openExport },
  { name: "desktop-quote-dialog", path: "/studio/mailer-001", profile: "desktop", wait: 2300, canvas: true, action: openQuote },
  { name: "desktop-admin", path: "/admin", profile: "desktop" },
  { name: "tablet-library", path: "/library", profile: "tablet" },
  { name: "tablet-studio", path: "/studio/display-001", profile: "tablet", wait: 2600, canvas: true },
  { name: "mobile-library", path: "/library", profile: "mobile" },
  { name: "mobile-studio-3d", path: "/studio/mailer-001", profile: "mobile", wait: 2600, canvas: true },
  { name: "mobile-studio-tools", path: "/studio/mailer-001", profile: "mobile", wait: 2300, canvas: true, action: openTools },
];

async function inspect(page: Page, result: Result, canvas = false) {
  const values = await page.evaluate(() => {
    const text = document.body.innerText;
    const broken = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src || image.alt || "unknown");
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyLength: text.trim().length,
      broken,
      keys: [...new Set(text.match(/\b(?:export|admin|library|studio|common|quote)\.[a-z][a-z0-9_.-]*/gi) ?? [])],
      undefinedText: /\bundefined\b/.test(text),
      objectText: text.includes("[object Object]"),
      canvases: document.querySelectorAll("canvas").length,
    };
  });

  if (values.scrollWidth - values.clientWidth > 2) result.errors.push(`Horizontal overflow ${values.scrollWidth}/${values.clientWidth}`);
  if (values.bodyLength < 20) result.errors.push("Page content is empty");
  if (values.broken.length) result.errors.push(`Broken images: ${values.broken.join(", ")}`);
  if (values.keys.length) result.errors.push(`Raw translation keys: ${values.keys.join(", ")}`);
  if (values.undefinedText) result.errors.push("Visible undefined value");
  if (values.objectText) result.errors.push("Visible [object Object] value");
  if (canvas && values.canvases < 1) result.errors.push("Three.js canvas is missing");
}

async function capture(context: BrowserContext, page: Page, destination: string) {
  const session = await context.newCDPSession(page);
  try {
    const image = await session.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await Bun.write(destination, Buffer.from(image.data, "base64"));
  } finally {
    await session.detach();
  }
}

const results: Result[] = [];
for (const [index, scenario] of scenarios.entries()) {
  console.log(`[${index + 1}/${scenarios.length}] ${scenario.name}`);
  const context = await browser.newContext(options(scenario.profile));
  const page = await context.newPage();
  page.setDefaultTimeout(6500);
  const result: Result = { ...scenario, stage: "setup", errors: [], warnings: [] };

  page.on("pageerror", (error) => result.errors.push(`Page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") result.errors.push(`Console error: ${message.text()}`);
    if (message.type() === "warning") result.warnings.push(`Console warning: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !response.url().includes("favicon")) {
      result.errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    await bounded((async () => {
      result.stage = "navigation";
      const response = await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      result.status = response?.status();
      if (!response || response.status() >= 400) result.errors.push(`Navigation status ${response?.status() ?? "none"}`);

      result.stage = "settle";
      await page.waitForTimeout(scenario.wait ?? 1500);

      if (scenario.action) {
        result.stage = "interaction";
        await scenario.action(page);
      }

      result.stage = "inspection";
      await inspect(page, result, scenario.canvas);

      result.stage = "capture";
      const destination = `${output}/${scenario.name}.png`;
      await capture(context, page, destination);
      result.screenshot = destination;
      result.stage = "complete";
    })(), scenario.name);
  } catch (error) {
    result.errors.push(`${result.stage}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    results.push(result);
    await Bun.write(`${output}/${scenario.name}.json`, JSON.stringify(result, null, 2));
    await context.close().catch(() => undefined);
  }
}

await browser.close();
const failed = results.filter((result) => result.errors.length);
const summary = { generatedAt: new Date().toISOString(), baseUrl, total: results.length, passed: results.length - failed.length, failed: failed.length, results };
await Bun.write(`${output}/summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ total: summary.total, passed: summary.passed, failed: summary.failed }, null, 2));
if (failed.length) {
  for (const result of failed) console.error(`${result.name} [${result.stage}]: ${result.errors.join(" | ")}`);
  process.exit(1);
}
