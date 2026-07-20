import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE_URL = "http://127.0.0.1:4173";
const OUTPUT = process.env.VISUAL_AUDIT_OUTPUT ?? "artifacts/full-app-visual-audit";

type Capture = {
  name: string;
  url: string;
  viewport: { width: number; height: number };
  document: { width: number; height: number; overflowX: number; language: string | null };
};

const captures: Capture[] = [];
let currentPage: Page | undefined;

async function settle(page: Page, delay = 850) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => document.fonts.ready);
  await page.waitForTimeout(delay);
}

async function go(page: Page, path: string) {
  currentPage = page;
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await settle(page);
}

async function capture(page: Page, name: string) {
  currentPage = page;
  await settle(page, 450);
  await page.screenshot({ path: join(OUTPUT, `${name}.png`), fullPage: true });
  const viewport = page.viewportSize() ?? { width: 0, height: 0 };
  const documentMetrics = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    language: document.documentElement.getAttribute("lang"),
  }));
  captures.push({ name, url: page.url(), viewport, document: documentMetrics });
}

async function clickAny(page: Page, names: string[]) {
  for (const name of names) {
    const locator = page.getByRole("button", { name, exact: true });
    if ((await locator.count()) > 0 && (await locator.first().isVisible().catch(() => false))) {
      await locator.first().click();
      return;
    }
  }
  throw new Error(`Visible button not found: ${names.join(" | ")}`);
}

async function setLocale(page: Page, locale: "bg" | "en") {
  const select = page.locator("header select").first();
  if (await select.isVisible().catch(() => false)) {
    await select.selectOption(locale);
    await page.waitForTimeout(350);
  }
}

async function setTheme(page: Page, theme: "dark" | "light") {
  const current = await page.evaluate(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  if (current !== theme) {
    await page.locator('header button[aria-label]').last().click();
    await page.waitForTimeout(300);
  }
}

async function signIn(page: Page, locale: "bg" | "en") {
  await page.locator('input[type="password"]').fill("visual-admin-key");
  await clickAny(page, locale === "bg" ? ["Влез", "Sign in"] : ["Sign in", "Влез"]);
  await page
    .getByRole("heading", {
      name: locale === "bg" ? "Административен център" : "Administration Center",
      exact: true,
    })
    .waitFor({ timeout: 15_000 });
  await settle(page, 550);
}

const viewModes = [
  { names: ["2D dieline", "2D дилайн"], file: "desktop-studio-2d" },
  { names: ["Split view", "Разделен изглед"], file: "desktop-studio-split" },
  { names: ["3D preview", "3D преглед"], file: "desktop-studio-3d-restored" },
];

const studioTabs = [
  { en: "Product", bg: "Продукт", slug: "product" },
  { en: "Size", bg: "Размери", slug: "size" },
  { en: "Material", bg: "Материал", slug: "material" },
  { en: "Artwork", bg: "Дизайн", slug: "artwork" },
  { en: "Finishes", bg: "Ефекти", slug: "finishes" },
  { en: "Scene", bg: "Сцена", slug: "scene" },
];

async function desktopAudit(context: BrowserContext) {
  const page = await context.newPage();
  currentPage = page;

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
  await capture(page, "desktop-studio-3d-default-bg");

  for (const mode of viewModes) {
    await clickAny(page, mode.names);
    await capture(page, mode.file);
  }

  await clickAny(page, ["professional", "Professional", "Професионален"]);
  await capture(page, "desktop-studio-professional-bg");

  for (const tab of studioTabs) {
    await clickAny(page, [tab.en, tab.bg]);
    await capture(page, `desktop-studio-tab-${tab.slug}-bg`);
  }

  await clickAny(page, ["Export", "Експорт"]);
  await page.getByRole("dialog").waitFor();
  await capture(page, "desktop-studio-export-dialog-bg");
  await clickAny(page, ["Cancel", "Отказ"]);

  await clickAny(page, ["Request quote", "Заявка за оферта"]);
  await page.getByRole("dialog").waitFor();
  await capture(page, "desktop-studio-quote-dialog-bg");
  await page.keyboard.press("Escape");

  await clickAny(page, ["Save project", "Запази проекта"]);
  await go(page, "/configurations");
  await capture(page, "desktop-saved-projects-bg");

  await go(page, "/missing-visual-audit-route");
  await capture(page, "desktop-not-found-bg");

  await go(page, "/admin/data");
  await setLocale(page, "bg");
  await capture(page, "desktop-admin-login-bg");
  await setLocale(page, "en");
  await capture(page, "desktop-admin-login-en");
  await signIn(page, "en");
  await capture(page, "desktop-admin-overview-en");
  await clickAny(page, ["EN"]);
  await capture(page, "desktop-admin-overview-bg");

  for (const label of [
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
  ]) {
    const button = page.getByRole("button", { name: label, exact: true });
    if ((await button.count()) > 0 && (await button.first().isVisible().catch(() => false))) {
      await button.first().click();
      const slug = label.replace(/[^a-zA-Z0-9а-яА-Я]+/g, "-").toLowerCase();
      await capture(page, `desktop-admin-${slug}`);
    }
  }
  await page.close();
}

async function tabletAudit(context: BrowserContext) {
  const page = await context.newPage();
  currentPage = page;
  await go(page, "/library");
  await setLocale(page, "bg");
  await capture(page, "tablet-library-bg");
  await go(page, "/studio/rigid-001");
  await page.getByText("Rigid Gift Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await capture(page, "tablet-studio-rigid-3d-bg");
  await clickAny(page, ["Split view", "Разделен изглед"]);
  await capture(page, "tablet-studio-rigid-split-bg");
  await page.close();
}

async function mobileAudit(context: BrowserContext) {
  const page = await context.newPage();
  currentPage = page;
  await go(page, "/");
  await setLocale(page, "bg");
  await setTheme(page, "dark");
  await capture(page, "mobile-landing-bg");
  await go(page, "/library");
  await capture(page, "mobile-library-bg");
  await go(page, "/studio/mailer-001");
  await page.getByText("Mailer Box", { exact: true }).first().waitFor({ timeout: 15_000 });
  await capture(page, "mobile-studio-3d-bg");

  for (const tab of studioTabs) {
    const buttons = [
      page.getByRole("button", { name: tab.bg, exact: true }),
      page.getByRole("button", { name: tab.en, exact: true }),
    ];
    const candidate = (await buttons[0].count()) > 0 ? buttons[0].last() : buttons[1].last();
    await candidate.click();
    await capture(page, `mobile-studio-sheet-${tab.slug}-bg`);
    await clickAny(page, ["Close tools", "Затвори инструментите", "Затвори"]);
  }

  await go(page, "/configurations");
  await capture(page, "mobile-saved-projects-bg");
  await go(page, "/admin/data");
  await setLocale(page, "bg");
  await capture(page, "mobile-admin-login-bg");
  await signIn(page, "bg");
  await capture(page, "mobile-admin-overview-bg");
  await page.close();
}

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader", "--disable-dev-shm-usage"],
});

let failure: string | null = null;
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await desktopAudit(desktop);
  await desktop.close();
  const tablet = await browser.newContext({ viewport: { width: 1024, height: 1366 } });
  await tabletAudit(tablet);
  await tablet.close();
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobileAudit(mobile);
  await mobile.close();
} catch (error) {
  failure = error instanceof Error ? error.stack ?? error.message : String(error);
  if (currentPage) {
    await currentPage.screenshot({ path: join(OUTPUT, "visual-audit-failure.png"), fullPage: true }).catch(() => undefined);
  }
} finally {
  await browser.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  captureCount: captures.length,
  failure,
  horizontalOverflow: captures
    .filter((item) => item.document.overflowX > 0)
    .map((item) => ({ name: item.name, overflowX: item.document.overflowX })),
  captures,
};
await writeFile(join(OUTPUT, "visual-audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failure) throw new Error(failure);
