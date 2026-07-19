import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE = "http://127.0.0.1:4173";
const OUTPUT = process.env.VISUAL_AUDIT_OUTPUT ?? "artifacts/final-visual-audit";
const captures: Array<Record<string, unknown>> = [];
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const requestFailures: string[] = [];
let activePage: Page | null = null;
let failure: string | null = null;

async function settle(page: Page, ms = 650) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(ms);
}

function observe(page: Page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${page.url()} :: ${message.text()}`);
  });
  page.on("pageerror", (error) => pageErrors.push(`${page.url()} :: ${error.message}`));
  page.on("requestfailed", (request) =>
    requestFailures.push(`${request.url()} :: ${request.failure()?.errorText ?? "failed"}`),
  );
}

async function go(page: Page, path: string) {
  activePage = page;
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await settle(page);
}

async function shot(page: Page, name: string) {
  activePage = page;
  await settle(page, 350);
  await page.screenshot({ path: join(OUTPUT, `${name}.png`), fullPage: true });
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    clientWidth: document.documentElement.clientWidth,
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    lang: document.documentElement.lang,
  }));
  captures.push({ name, url: page.url(), viewport: page.viewportSize(), metrics });
}

async function locale(page: Page, value: "bg" | "en") {
  const select = page.locator("header select").first();
  if (await select.isVisible().catch(() => false)) {
    await select.selectOption(value);
    await page.waitForTimeout(400);
  }
}

async function theme(page: Page, value: "dark" | "light") {
  const current = await page.evaluate(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  if (current !== value) {
    await page.locator("header button").last().click();
    await page.waitForTimeout(350);
  }
}

async function button(page: Page, names: string[]) {
  for (const name of names) {
    const candidate = page.getByRole("button", { name, exact: true });
    if ((await candidate.count()) > 0 && (await candidate.first().isVisible().catch(() => false))) {
      await candidate.first().click();
      return;
    }
  }
  throw new Error(`Button not found: ${names.join(" | ")}`);
}

async function signIn(page: Page, language: "bg" | "en") {
  await page.locator('input[type="password"]').fill("visual-admin-key");
  await button(page, language === "bg" ? ["Влез", "Sign in"] : ["Sign in", "Влез"]);
  await page
    .getByRole("heading", {
      name: language === "bg" ? "Административен център" : "Administration Center",
      exact: true,
    })
    .waitFor({ timeout: 15_000 });
  await settle(page);
}

const tabs = [
  ["Product", "Продукт", "product"],
  ["Size", "Размери", "size"],
  ["Material", "Материал", "material"],
  ["Artwork", "Дизайн", "artwork"],
  ["Finishes", "Ефекти", "finishes"],
  ["Scene", "Сцена", "scene"],
] as const;

async function desktop(context: BrowserContext) {
  const page = await context.newPage();
  observe(page);
  await go(page, "/");
  await locale(page, "bg");
  await theme(page, "dark");
  await shot(page, "desktop-landing-bg-dark");
  await theme(page, "light");
  await shot(page, "desktop-landing-bg-light");
  await theme(page, "dark");
  await locale(page, "en");
  await shot(page, "desktop-landing-en-dark");

  await go(page, "/library");
  await locale(page, "bg");
  await shot(page, "desktop-library-bg");
  await locale(page, "en");
  await shot(page, "desktop-library-en");

  await go(page, "/studio");
  await locale(page, "bg");
  await shot(page, "desktop-studio-empty-bg");
  await go(page, "/studio/mailer-001");
  await page.getByText("Mailer Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await shot(page, "desktop-studio-3d-bg");

  for (const [names, name] of [
    [["2D дилайн", "2D dieline"], "desktop-studio-2d-bg"],
    [["Разделен изглед", "Split view"], "desktop-studio-split-bg"],
    [["3D преглед", "3D preview"], "desktop-studio-3d-restored-bg"],
  ] as const) {
    await button(page, [...names]);
    await shot(page, name);
  }

  await button(page, ["Професионален", "Professional", "professional"]);
  await shot(page, "desktop-studio-professional-bg");
  for (const [en, bg, slug] of tabs) {
    await button(page, [bg, en]);
    await shot(page, `desktop-studio-tab-${slug}-bg`);
  }

  await button(page, ["Експорт", "Export"]);
  const exportDialog = page.getByRole("dialog");
  await exportDialog.waitFor();
  await shot(page, "desktop-studio-export-dialog-bg");
  await button(page, ["Отказ", "Cancel"]);
  await exportDialog.waitFor({ state: "hidden", timeout: 10_000 });

  await button(page, ["Заявка за оферта", "Request quote"]);
  const quoteDialog = page.getByRole("dialog");
  await quoteDialog.waitFor();
  await shot(page, "desktop-studio-quote-dialog-bg");
  await page.keyboard.press("Escape");
  await quoteDialog.waitFor({ state: "hidden", timeout: 10_000 });

  await button(page, ["Запази проекта", "Save project"]);
  await go(page, "/configurations");
  await shot(page, "desktop-saved-bg");
  await go(page, "/visual-audit-not-found");
  await shot(page, "desktop-not-found-bg");

  await go(page, "/admin/data");
  await locale(page, "bg");
  await shot(page, "desktop-admin-login-bg");
  await locale(page, "en");
  await shot(page, "desktop-admin-login-en");
  await signIn(page, "en");
  await shot(page, "desktop-admin-overview-en");
  await button(page, ["EN"]);
  await shot(page, "desktop-admin-overview-bg");
  for (const name of ["Продукти", "Материали", "3D и дилайни", "Системни настройки", "Одит и активност"]) {
    const candidate = page.getByRole("button", { name, exact: true });
    if ((await candidate.count()) > 0) {
      await candidate.first().click();
      await shot(page, `desktop-admin-${name.replace(/[^a-zA-Z0-9а-яА-Я]+/g, "-").toLowerCase()}`);
    }
  }
  await page.close();
}

async function tablet(context: BrowserContext) {
  const page = await context.newPage();
  observe(page);
  await go(page, "/library");
  await locale(page, "bg");
  await shot(page, "tablet-library-bg");
  await go(page, "/studio/rigid-001");
  await page.getByText("Rigid Gift Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await shot(page, "tablet-studio-rigid-3d-bg");
  await button(page, ["Разделен изглед", "Split view"]);
  await shot(page, "tablet-studio-rigid-split-bg");
  await page.close();
}

async function mobile(context: BrowserContext) {
  const page = await context.newPage();
  observe(page);
  await go(page, "/");
  await locale(page, "bg");
  await theme(page, "dark");
  await shot(page, "mobile-landing-bg");
  await go(page, "/library");
  await shot(page, "mobile-library-bg");
  await go(page, "/studio/mailer-001");
  await page.getByText("Mailer Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await shot(page, "mobile-studio-3d-bg");

  for (const [en, bg, slug] of tabs) {
    const bgButton = page.getByRole("button", { name: bg, exact: true });
    const enButton = page.getByRole("button", { name: en, exact: true });
    const candidate = (await bgButton.count()) > 0 ? bgButton.last() : enButton.last();
    await candidate.click();
    await shot(page, `mobile-studio-sheet-${slug}-bg`);
    const sheet = page.locator(".fixed.inset-0").last();
    await sheet.locator("button.studio-icon-button").last().click();
    await sheet.waitFor({ state: "hidden", timeout: 10_000 });
  }

  await go(page, "/admin/data");
  await locale(page, "bg");
  await shot(page, "mobile-admin-login-bg");
  await signIn(page, "bg");
  await shot(page, "mobile-admin-overview-bg");
  await page.close();
}

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--disable-dev-shm-usage"],
});

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await desktop(desktopContext);
  await desktopContext.close();
  const tabletContext = await browser.newContext({ viewport: { width: 1024, height: 1366 } });
  await tablet(tabletContext);
  await tabletContext.close();
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobile(mobileContext);
  await mobileContext.close();
} catch (error) {
  failure = error instanceof Error ? error.stack ?? error.message : String(error);
  if (activePage) {
    await activePage.screenshot({ path: join(OUTPUT, "failure.png"), fullPage: true }).catch(() => undefined);
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  captureCount: captures.length,
  failure,
  horizontalOverflow: captures.filter((capture) => {
    const metrics = capture.metrics as { overflowX?: number };
    return (metrics.overflowX ?? 0) > 0;
  }),
  consoleErrors,
  pageErrors,
  requestFailures,
  captures,
};
await writeFile(join(OUTPUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failure) process.exitCode = 1;
