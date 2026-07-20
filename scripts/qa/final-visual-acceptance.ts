import { chromium, devices, type BrowserContext, type Page } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:4173";
const output = resolve(process.env.QA_OUTPUT ?? "artifacts/final-visual-acceptance");
const scenarioTimeoutMs = 25_000;
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });

type Profile = "desktop" | "tablet" | "mobile";
type Scenario = {
  name: string;
  path: string;
  profile: Profile;
  settleMs?: number;
  action?: (page: Page) => Promise<void>;
  expectCanvas?: boolean;
};

type Result = {
  name: string;
  path: string;
  profile: Profile;
  status?: number;
  width: number;
  height: number;
  errors: string[];
  warnings: string[];
  screenshot?: string;
};

function contextOptions(profile: Profile) {
  if (profile === "mobile") {
    return { ...devices["Pixel 7"], locale: "bg-BG", colorScheme: "dark" as const };
  }
  if (profile === "tablet") {
    return {
      viewport: { width: 1024, height: 1366 },
      deviceScaleFactor: 1,
      locale: "bg-BG",
      colorScheme: "dark" as const,
    };
  }
  return {
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    locale: "bg-BG",
    colorScheme: "dark" as const,
  };
}

async function withTimeout<T>(promise: Promise<T>, label: string, milliseconds = scenarioTimeoutMs) {
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

async function clickVisible(page: Page, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const byRole = page.getByRole("button", { name: pattern }).first();
    if (await byRole.isVisible().catch(() => false)) {
      await byRole.click();
      return;
    }
    const byText = page.getByText(pattern).first();
    if (await byText.isVisible().catch(() => false)) {
      await byText.click();
      return;
    }
  }
  throw new Error(`Visible control not found: ${patterns.map(String).join(", ")}`);
}

async function openExport(page: Page) {
  await clickVisible(page, [/^Експорт$/i, /^Export$/i]);
  await page.getByRole("dialog").waitFor({ state: "visible" });
}

async function openQuote(page: Page) {
  await clickVisible(page, [/Оферта/i, /Request quote/i]);
  await page.getByRole("dialog").waitFor({ state: "visible" });
}

async function switch2d(page: Page) {
  await clickVisible(page, [/2D.*дилайн/i, /2D.*dieline/i]);
  await page.waitForTimeout(700);
}

async function switchSplit(page: Page) {
  await clickVisible(page, [/Разделен изглед/i, /Split view/i]);
  await page.waitForTimeout(900);
}

async function openMobileTools(page: Page) {
  await clickVisible(page, [/Отвори.*инструмент/i, /Open editor tools/i, /^Product$/i]);
  await page.waitForTimeout(400);
}

const scenarios: Scenario[] = [
  { name: "desktop-landing", path: "/", profile: "desktop" },
  { name: "desktop-library", path: "/library", profile: "desktop" },
  {
    name: "desktop-studio-3d-mailer",
    path: "/studio/mailer-001",
    profile: "desktop",
    settleMs: 2600,
    expectCanvas: true,
  },
  {
    name: "desktop-studio-2d-mailer",
    path: "/studio/mailer-001",
    profile: "desktop",
    settleMs: 2200,
    action: switch2d,
  },
  {
    name: "desktop-studio-split-rigid",
    path: "/studio/rigid-001",
    profile: "desktop",
    settleMs: 2600,
    action: switchSplit,
    expectCanvas: true,
  },
  {
    name: "desktop-export-dialog",
    path: "/studio/mailer-001",
    profile: "desktop",
    settleMs: 2300,
    action: openExport,
    expectCanvas: true,
  },
  {
    name: "desktop-quote-dialog",
    path: "/studio/mailer-001",
    profile: "desktop",
    settleMs: 2300,
    action: openQuote,
    expectCanvas: true,
  },
  { name: "desktop-admin", path: "/admin", profile: "desktop" },
  { name: "tablet-library", path: "/library", profile: "tablet" },
  {
    name: "tablet-studio",
    path: "/studio/display-001",
    profile: "tablet",
    settleMs: 2600,
    expectCanvas: true,
  },
  { name: "mobile-library", path: "/library", profile: "mobile" },
  {
    name: "mobile-studio-3d",
    path: "/studio/mailer-001",
    profile: "mobile",
    settleMs: 2600,
    expectCanvas: true,
  },
  {
    name: "mobile-studio-tools",
    path: "/studio/mailer-001",
    profile: "mobile",
    settleMs: 2300,
    action: openMobileTools,
    expectCanvas: true,
  },
];

const results: Result[] = [];

async function inspectPage(page: Page, result: Result, expectCanvas = false) {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const bodyText = document.body.innerText;
    const brokenImages = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src || image.alt || "unknown image");
    const rawTranslationKeys =
      bodyText.match(/\b(?:export|admin|library|studio|common|quote)\.[a-z][a-z0-9_.-]*/gi) ?? [];
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      brokenImages,
      rawTranslationKeys: [...new Set(rawTranslationKeys)],
      hasUndefined: /\bundefined\b/.test(bodyText),
      hasObjectObject: bodyText.includes("[object Object]"),
      canvasCount: document.querySelectorAll("canvas").length,
      bodyLength: bodyText.trim().length,
    };
  });

  if (metrics.scrollWidth - metrics.clientWidth > 2) {
    result.errors.push(`Horizontal overflow: ${metrics.scrollWidth}px > ${metrics.clientWidth}px`);
  }
  if (metrics.brokenImages.length) {
    result.errors.push(`Broken images: ${metrics.brokenImages.join(", ")}`);
  }
  if (metrics.rawTranslationKeys.length) {
    result.errors.push(`Raw translation keys: ${metrics.rawTranslationKeys.join(", ")}`);
  }
  if (metrics.hasUndefined) result.errors.push("Visible undefined value");
  if (metrics.hasObjectObject) result.errors.push("Visible [object Object] value");
  if (metrics.bodyLength < 20) result.errors.push("Page body is unexpectedly empty");
  if (expectCanvas && metrics.canvasCount < 1) result.errors.push("Expected Three.js canvas is missing");
}

for (const [index, scenario] of scenarios.entries()) {
  console.log(`[${index + 1}/${scenarios.length}] START ${scenario.name}`);
  const context: BrowserContext = await browser.newContext(contextOptions(scenario.profile));
  const page = await context.newPage();
  page.setDefaultTimeout(7_000);
  page.setDefaultNavigationTimeout(35_000);

  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const result: Result = {
    name: scenario.name,
    path: scenario.path,
    profile: scenario.profile,
    width: viewport.width,
    height: viewport.height,
    errors: [],
    warnings: [],
  };

  page.on("pageerror", (error) => result.errors.push(`Page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") result.errors.push(`Console error: ${message.text()}`);
    if (message.type() === "warning") result.warnings.push(`Console warning: ${message.text()}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes("favicon")) result.errors.push(`HTTP ${status}: ${url}`);
  });

  try {
    await withTimeout(
      (async () => {
        const response = await page.goto(`${baseUrl}${scenario.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 35_000,
        });
        result.status = response?.status();
        if (!response || response.status() >= 400) {
          result.errors.push(`Navigation status: ${response?.status() ?? "no response"}`);
        }
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(scenario.settleMs ?? 1500);
        if (scenario.action) await scenario.action(page);
        await inspectPage(page, result, scenario.expectCanvas);

        const screenshot = `${output}/${scenario.name}.png`;
        await page.screenshot({
          path: screenshot,
          fullPage: false,
          animations: "disabled",
          caret: "hide",
          timeout: 12_000,
        });
        result.screenshot = screenshot;
      })(),
      scenario.name,
    );
  } catch (error) {
    result.errors.push(error instanceof Error ? error.stack ?? error.message : String(error));
  } finally {
    results.push(result);
    await Bun.write(`${output}/${scenario.name}.json`, JSON.stringify(result, null, 2));
    await context.close().catch(() => undefined);
    console.log(`[${index + 1}/${scenarios.length}] END ${scenario.name} errors=${result.errors.length}`);
  }
}

await browser.close();

const failed = results.filter((result) => result.errors.length > 0);
const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};
await Bun.write(`${output}/summary.json`, JSON.stringify(summary, null, 2));

console.log(JSON.stringify({ total: summary.total, passed: summary.passed, failed: summary.failed }, null, 2));
if (failed.length) {
  for (const result of failed) console.error(`${result.name}: ${result.errors.join(" | ")}`);
  process.exit(1);
}
