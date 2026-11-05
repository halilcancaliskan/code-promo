import { test, expect, type Page } from "@playwright/test";

const frame = (page: Page) => page.frameLocator("#basketball-promo-root iframe");

async function externalShop(page: Page, attributes: Record<string, string>) {
  const url = new URL("http://127.0.0.1:3001/");
  for (const [name, value] of Object.entries(attributes)) url.searchParams.set(name, value);
  await page.goto(url.href);
}

test("configuration collée : couleurs, code, conditions, date et popup compacte", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await externalShop(page, {
    "data-name": "Boutique personnalisée",
    "data-accent": "#285c4f", "data-background": "#f4faf4", "data-code": "EXTERNE20",
    "data-terms": "20 % dès 80 euros.", "data-expires-at": "2099-12-31T22:59:59Z",
  });
  const start = frame(page).getByRole("button", { name: "C'est parti !" });
  await expect(start).toBeEnabled();
  await expect(frame(page).locator(".frame-name")).toHaveText("Boutique personnalisée●");
  const attribution = frame(page).getByRole("link", { name: "webcaliskan" });
  await expect(attribution).toHaveAttribute("href", "https://www.instagram.com/webcaliskan/");
  await expect(frame(page).locator(".powered-by")).toHaveText("powered by webcaliskan");
  await page.context().route("https://www.instagram.com/**", (route) => route.fulfill({
    contentType: "text/html", body: "<title>Instagram test</title>",
  }));
  const newTab = page.waitForEvent("popup");
  await attribution.click();
  const instagram = await newTab;
  await instagram.waitForLoadState();
  expect(instagram.url()).toBe("https://www.instagram.com/webcaliskan/");
  await instagram.close();
  await expect(start).toHaveCSS("background-color", "rgb(40, 92, 79)");
  await expect(frame(page).locator("main")).toHaveCSS("background-color", "rgb(244, 250, 244)");
  const box = await page.getByRole("dialog").boundingBox();
  if (!box) throw new Error("Popup invisible.");
  expect(box.width).toBeLessThanOrEqual(380);
  expect(box.height).toBeLessThanOrEqual(620);
  await expect(start).toBeInViewport();
  await start.click();
  await expect(attribution).toBeVisible();
  const shoot = frame(page).getByRole("button", { name: "Tirer le ballon" });
  await expect(shoot).toBeInViewport();
  for (let i = 0; i < 3; i++) {
    await shoot.click();
    if (i < 2) await expect(shoot).toBeEnabled();
  }
  await expect(frame(page).getByLabel("VOTRE CODE PROMO")).toHaveValue("EXTERNE20");
  await expect(attribution).toBeVisible();
  await expect(frame(page).locator(".terms")).toContainText("20 % dès 80 euros.");
  await expect(frame(page).locator(".terms")).toContainText("31/12/2099");
  await expect(frame(page).getByRole("button", { name: "Continuer mes achats" })).toBeInViewport();
  await frame(page).getByRole("button", { name: "Copier le code" }).click();
  await expect(frame(page).getByRole("status")).toContainText("Code copié");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("EXTERNE20");
});

test("offre déjà expirée : aucune ouverture automatique ou manuelle", async ({ page }) => {
  await externalShop(page, { "data-expires-at": "2020-01-01T00:00:00Z" });
  await page.waitForTimeout(1700);
  await expect(page.locator("#basketball-promo-root")).toHaveCount(0);
  expect(await page.evaluate(() => window.BasketballPromo?.open())).toBe(false);
  await expect(page.locator("#basketball-promo-root")).toHaveCount(0);
});

test("expiration en pleine partie : fermeture et aucune récompense", async ({ page }) => {
  await externalShop(page, { "data-expires-at": new Date(Date.now() + 7000).toISOString() });
  await frame(page).getByRole("button", { name: "C'est parti !" }).click();
  await expect(page.locator("#basketball-promo-root")).toHaveCount(0, { timeout: 10000 });
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.endsWith(":won")))).toEqual([]);
  expect(await page.evaluate(() => window.BasketballPromo?.open())).toBe(false);
});

test("date impossible : erreur visible plutôt qu'une offre sans limite", async ({ page }) => {
  await externalShop(page, { "data-expires-at": "2026-02-30T00:00:00Z" });
  await expect(page.getByRole("status")).toContainText("Impossible d'initialiser");
  await expect(page.locator("#basketball-promo-root")).toHaveCount(0);
});
