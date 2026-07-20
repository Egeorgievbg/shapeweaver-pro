import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://127.0.0.1:4173";
const OUTPUT = process.env.VISUAL_AUDIT_OUTPUT ?? "artifacts/full-app-visual-audit";

type CaptureResult = {
  name: string;
  url: string;
  viewport: { width: number; height: number };
  screenshot: string;
  document: { width: number; height: number; overflowX: number; language: string | null };
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
};

const results: CaptureResult[] = [];

async function stabilize(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(1_200);
}

async function capture(page: Page, name: string) {
  await stabilize(page);
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const screenshot = `${name}.png`;
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];

  const consoleHandler = (message: { type(): string; text(): string }) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const pageErrorHandler = (error: Error) => pageErrors.push(error.message);
  const requestFailureHandler = (request: { url(): string; failure(): { errorText?: string } | null }) =>
    requestFailures.push(`${request.url()} :: ${request.failure()?.errorText ?? "failed"}`);

  page.on("console", consoleHandler);
  page.on("pageerror", pageErrorHandler);
  page.on("requestfailed", requestFailureHandler);

  await page.screenshot({ path: join(OUTPUT, screenshot), fullPage: true });
  const documentMetrics = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    language: document.documentElement.getAttribute("lang"),
  }));

  page.off("console", consoleHandler);
  page.off("pageerror", pageErrorHandler);
  page.off("requestfailed", requestFailureHandler);

  results.push({
    name,
    url: page.url(),
    viewport,
    screenshot,
    document: documentMetrics,
    consoleErrors,
    pageErrors,
    requestFailures,
  });
}

async function go(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await stabilize(page);
}

async function setLocale(page: Page, locale: "bg" | "en") {
  const select = page.locator("header select").first();
  if (await select.isVisible().catch(() => false)) {
    await select.selectOption(locale);
    await page.waitForTimeout(450);
  }
}

async function setTheme(page: Page, theme: "dark" | "light") {
  const current = await page.evaluate(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  if (current !== theme) {
    await page.locator('header button[aria-label]').last().click();
    await page.waitForTimeout(350);
  }
}

async function signIn(page: Page, locale: "bg" | "en") {
  await page.locator('input[type="password"]').fill("visual-admin-key");
  await page
    .getByRole("button", { name: locale === "bg" ? "Влез" : "Sign in", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: locale === "bg" ? "Административен център" : "Administration Center",
      exact: true,
    })
    .waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
}

async function desktopAudit(context: BrowserContext) {
  const page = await context.newPage();

  await go(page, "/");
  await setLocale(page, "bg");
  await setTheme(page, "dark");
  await capture(page, "desktop-landing-bg-dark");
  await setTheme(page, "light");
  await capture(page, "desktop-landing-bg-light");
  await setTheme(page, "dark");
  await setLocale(page, "en");
  await capture(page, "desktop-landing-en-dark");

  await go(page, "/library");
  await setLocale(page, "bg");
  await capture(page, "desktop-library-bg");
  await setLocale(page, "en");
  await capture(page, "desktop-library-en");

  await go(page, "/studio");
  await setLocale(page, "bg");
  await capture(page, "desktop-studio-empty-bg");

  await go(page, "/studio/mailer-001");
  await page.getByText("Mailer Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await capture(page, "desktop-studio-3d-default");

  for (const [label, name] of [
    ["2D dieline", "desktop-studio-2d"],
    ["Split view", "desktop-studio-split"],
    ["3D preview", "desktop-studio-3d-restored"],
  ] as const) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(700);
    await capture(page, name);
  }

  await page.getByRole("button", { name: "professional", exact: true }).click();
  await capture(page, "desktop-studio-professional");

  for (const tab of ["Product", "Size", "Material", "Artwork", "Finishes", "Scene"] as const) {
    await page.getByRole("button", { name: tab, exact: true }).first().click();
    await page.waitForTimeout(350);
    await capture(page, `desktop-studio-tab-${tab.toLowerCase()}`);
  }

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await capture(page, "desktop-studio-export-dialog");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.getByRole("button", { name: /Request quote/i }).click();
  await page.getByRole("dialog").waitFor();
  await capture(page, "desktop-studio-quote-dialog");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await go(page, "/configurations");
  await capture(page, "desktop-saved-projects");

  await go(page, "/missing-visual-audit-route");
  await capture(page, "desktop-not-found");

  await go(page, "/admin/data");
  await setLocale(page, "bg");
  await capture(page, "desktop-admin-login-bg");
  await setLocale(page, "en");
  await capture(page, "desktop-admin-login-en");
  await signIn(page, "en");
  await capture(page, "desktop-admin-overview-en");
  await page.getByRole("button", { name: /^EN$/ }).click();
  await capture(page, "desktop-admin-overview-bg");

  const adminModules = [
    "Продукти",
    "Категории и семейства",
    "Материали",
    "Съдържание и преводи",
    "3D и дилайни",
    "Файлове и изображения",
    "Оферти и експорти",
    "Потребители и роли",
    "Интеграции",
    "Системни настройки",
    "Одит и активност",
  ];
  for (const label of adminModules) {
    const button = page.getByRole("button", { name: label, exact: true });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(350);
      const slug = label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9а-яА-Я]+/g, "-")
        .toLowerCase();
      await capture(page, `desktop-admin-${slug}`);
    }
  }

  await page.close();
}

async function mobileAudit(context: BrowserContext) {
  const page = await context.newPage();

  await go(page, "/");
  await setLocale(page, "bg");
  await setTheme(page, "dark");
  await capture(page, "mobile-landing-bg");

  await go(page, "/library");
  await capture(page, "mobile-library-bg");

  await go(page, "/studio/mailer-001");
  await page.getByText("Mailer Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await capture(page, "mobile-studio-3d");

  for (const tab of ["Product", "Size", "Material", "Artwork", "Finishes", "Scene"] as const) {
    await page.getByRole("button", { name: tab, exact: true }).last().click();
    await page.waitForTimeout(300);
    await capture(page, `mobile-studio-sheet-${tab.toLowerCase()}`);
    await page.getByRole("button", { name: "Close tools", exact: true }).last().click();
  }

  await go(page, "/configurations");
  await capture(page, "mobile-saved-projects");

  await go(page, "/admin/data");
  await setLocale(page, "bg");
  await capture(page, "mobile-admin-login-bg");
  await signIn(page, "bg");
  await capture(page, "mobile-admin-overview-bg");

  await page.close();
}

async function tabletAudit(context: BrowserContext) {
  const page = await context.newPage();
  await go(page, "/library");
  await setLocale(page, "bg");
  await capture(page, "tablet-library-bg");
  await go(page, "/studio/rigid-001");
  await page.getByText("Rigid Gift Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await capture(page, "tablet-studio-rigid-3d");
  await page.getByRole("button", { name: "Split view", exact: true }).click();
  await capture(page, "tablet-studio-rigid-split");
  await page.close();
}

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-angle=swiftshader",
    "--disable-dev-shm-usage",
  ],
});

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await desktopAudit(desktop);
  await desktop.close();

  const tablet = await browser.newContext({ viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 1 });
  await tabletAudit(tablet);
  await tablet.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobileAudit(mobile);
  await mobile.close();
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  captureCount: results.length,
  horizontalOverflow: results.filter((item) => item.document.overflowX > 0).map((item) => ({
    name: item.name,
    overflowX: item.document.overflowX,
  })),
  consoleErrorCount: results.reduce((sum, item) => sum + item.consoleErrors.length, 0),
  pageErrorCount: results.reduce((sum, item) => sum + item.pageErrors.length, 0),
  requestFailureCount: results.reduce((sum, item) => sum + item.requestFailures.length, 0),
  captures: results,
};

await writeFile(join(OUTPUT, "visual-audit-report.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
