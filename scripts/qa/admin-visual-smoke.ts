import { writeFile } from "node:fs/promises";
import { chromium, type Browser, type Page } from "playwright";

const BASE_URL = "http://127.0.0.1:4173";
let browser: Browser | undefined;
let activePage: Page | undefined;

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
}

async function capture(page: Page, name: string) {
  activePage = page;
  await page.screenshot({ path: `${name}.png`, fullPage: true });
  await writeFile(`${name}.txt`, await page.locator("body").innerText());
}

async function main() {
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  activePage = page;

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);
  if ((await page.locator("html").getAttribute("lang")) !== "bg") {
    throw new Error("Bulgarian is not the default locale");
  }
  await capture(page, "landing-bg-desktop");

  await page.locator("header select").selectOption("en");
  await page
    .locator("header")
    .getByRole("link", { name: "Library", exact: true })
    .waitFor({ timeout: 10_000 });
  if ((await page.locator("html").getAttribute("lang")) !== "en") {
    throw new Error("English locale switch failed");
  }
  await capture(page, "landing-en-desktop");

  await page.goto(`${BASE_URL}/admin/data`, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "Administration sign in", exact: true })
    .waitFor({ timeout: 10_000 });
  await capture(page, "admin-login-en-desktop");

  await signIn(page, "en");
  await page.waitForTimeout(1_200);
  await capture(page, "admin-en-desktop");

  await page.locator("header select").selectOption("bg");
  await page.waitForTimeout(1_000);
  await capture(page, "admin-bg-before-assertions");
  await page
    .getByRole("heading", { name: "Административен център", exact: true })
    .waitFor({ timeout: 10_000 });

  if ((await page.locator("html").getAttribute("lang")) !== "bg") {
    throw new Error("Bulgarian locale restore failed");
  }

  const bgText = await page.locator("body").innerText();
  for (const forbidden of ["Backend capabilities", "same-origin proxy", "Technical diagnostics"]) {
    if (bgText.includes(forbidden)) throw new Error(`Mixed Bulgarian interface: ${forbidden}`);
  }
  for (const required of ["Административен център", "Възможности на сървъра", "Онлайн"]) {
    if (!bgText.includes(required)) throw new Error(`Bulgarian label missing: ${required}`);
  }
  await capture(page, "admin-bg-desktop");
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
  });
  const mobilePage = await mobile.newPage();
  activePage = mobilePage;
  await mobilePage.goto(`${BASE_URL}/admin/data`, { waitUntil: "domcontentloaded" });
  await mobilePage
    .getByRole("heading", { name: "Вход в администрацията", exact: true })
    .waitFor({ timeout: 10_000 });
  await capture(mobilePage, "admin-login-bg-mobile");
  await signIn(mobilePage, "bg");
  await mobilePage.waitForTimeout(1_200);
  await capture(mobilePage, "admin-bg-mobile");
  await mobile.close();
}

try {
  await main();
  await writeFile("visual-result.txt", "success\n");
} catch (error) {
  const message =
    error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`;
  await writeFile("visual-error.txt", message);
  if (activePage) {
    await activePage
      .screenshot({ path: "visual-failure.png", fullPage: true })
      .catch(() => undefined);
    await writeFile("visual-failure-body.txt", await activePage.locator("body").innerText()).catch(
      () => undefined,
    );
  }
  throw error;
} finally {
  await browser?.close().catch(() => undefined);
}
