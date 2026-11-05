import { test, expect, type Page } from "@playwright/test";

const frame = (page: Page) => page.frameLocator("#basketball-promo-root iframe");
const root = (page: Page) => page.locator("#basketball-promo-root");
const close = (page: Page) => page.getByRole("button", { name: "Fermer le jeu" });

test("pointillés visibles et mis à jour avec Angle 71 et Force 66", async ({ page }) => {
  await page.goto("/");
  await frame(page).getByRole("button", { name: "C'est parti !" }).click();
  const canvas = frame(page).getByRole("img", { name: /Terrain de basketball/ });
  async function hasDot(angle: number, power: number) {
    return canvas.evaluate((element: HTMLCanvasElement, values) => {
      const ctx = element.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D indisponible.");
      const radians = values.angle * Math.PI / 180;
      const t = 0.4;
      const x = 110 + values.power * Math.cos(radians) * 8 * t;
      const y = 365 - values.power * Math.sin(radians) * 8 * t + 700 * t * t / 2;
      const scale = element.width / 360;
      const pixels = ctx.getImageData(Math.floor(x * scale) - 2, Math.floor(y * scale) - 2, 5, 5).data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === 126 && pixels[i + 1] === 107 && pixels[i + 2] === 84) return true;
      }
      return false;
    }, { angle, power });
  }
  await expect.poll(() => hasDot(79, 76)).toBe(true);
  await frame(page).getByLabel("Angle :").fill("71");
  await expect.poll(() => hasDot(71, 76)).toBe(true);
  await frame(page).getByLabel("Force :").fill("66");
  await expect.poll(() => hasDot(71, 66)).toBe(true);
  await expect.poll(() => hasDot(79, 76)).toBe(false);
  const shoot = frame(page).getByRole("button", { name: "Tirer le ballon" });
  await shoot.click();
  await expect.poll(() => hasDot(71, 66)).toBe(false);
  await expect(shoot).toBeEnabled();
  await expect.poll(() => hasDot(71, 66)).toBe(true);
});

test("popup : une fois par session, fermeture et restauration du focus/défilement", async ({ page }) => {
  await page.goto("/");
  await expect(close(page)).toBeVisible();
  await close(page).click();
  await page.reload();
  await page.waitForTimeout(1700);
  await expect(root(page)).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Tester le mini-jeu" });
  await trigger.focus();
  await trigger.click();
  await expect(frame(page).getByRole("button", { name: "C'est parti !" })).toBeEnabled();
  await expect(page.locator(".demo-wrap")).toHaveAttribute("inert", "");
  await close(page).press("Tab");
  await expect(frame(page).getByRole("link", { name: "webcaliskan" })).toBeFocused();
  await frame(page).getByRole("link", { name: "webcaliskan" }).press("Shift+Tab");
  await expect(close(page)).toBeFocused();
  await frame(page).getByRole("button", { name: "Une prochaine fois" }).press("Tab");
  await expect(close(page)).toBeFocused();
  await close(page).press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  await expect(page.locator(".demo-wrap")).not.toHaveAttribute("inert", "");
});

test("trois paniers, code copiable et réussite mémorisée", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await frame(page).getByRole("button", { name: "C'est parti !" }).click();
  const shoot = frame(page).getByRole("button", { name: "Tirer le ballon" });
  for (let basket = 1; basket <= 3; basket++) {
    await shoot.click();
    await expect(frame(page).getByLabel(`${basket} paniers sur 3`)).toBeVisible();
    if (basket < 3) await expect(shoot).toBeEnabled();
  }
  await expect(frame(page).getByRole("heading", { name: "Bien joué, champion !" })).toBeVisible();
  await expect(frame(page).getByLabel("VOTRE CODE PROMO")).toHaveValue("PANIER10");
  await frame(page).getByRole("button", { name: "Copier le code" }).click();
  await expect(frame(page).getByRole("status")).toContainText("Code copié");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("PANIER10");
  await frame(page).getByRole("button", { name: "Continuer mes achats" }).click();
  await page.reload();
  await page.waitForTimeout(1700);
  await expect(root(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Tester le mini-jeu" }).click();
  await expect(frame(page).getByRole("heading", { name: "Bien joué, champion !" })).toBeVisible();
});

test("glisser puis relâcher fonctionne, un échec permet de recommencer", async ({ page, isMobile }) => {
  await page.goto("/");
  await frame(page).getByRole("button", { name: "C'est parti !" }).click();
  const shoot = frame(page).getByRole("button", { name: "Tirer le ballon" });
  await frame(page).getByLabel("Force :").fill("35");
  await shoot.click();
  await expect(frame(page).getByRole("status")).toContainText("Presque");
  await expect(shoot).toBeEnabled();
  const canvas = frame(page).getByRole("img", { name: /Terrain de basketball/ });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Terrain invisible.");
  const x = box.x + 110 / 360 * box.width;
  const y = box.y + 365 / 440 * box.height;
  if (isMobile) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 12; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - 15 / 360 * box.width * i / 12, y: y + 75 / 440 * box.height * i / 12 }],
      });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 15 / 360 * box.width, y + 75 / 440 * box.height, { steps: 12 });
    await page.mouse.up();
  }
  await expect(frame(page).getByLabel("1 paniers sur 3")).toBeVisible();
});

test("vraie boutique externe : iframe cross-origin, copie et défilement", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("http://127.0.0.1:3001");
  await expect(frame(page).getByRole("button", { name: "C'est parti !" })).toBeEnabled();
  await close(page).click();
  await page.evaluate(() => window.scrollTo(0, 400));
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.BasketballPromo?.open());
  await expect(close(page)).toBeVisible();
  await frame(page).getByRole("button", { name: "C'est parti !" }).click();
  const shoot = frame(page).getByRole("button", { name: "Tirer le ballon" });
  for (let i = 0; i < 3; i++) {
    await shoot.click();
    if (i < 2) await expect(shoot).toBeEnabled();
  }
  await frame(page).getByRole("button", { name: "Copier le code" }).click();
  await expect(frame(page).getByRole("status")).toContainText("Code copié");
  await frame(page).getByRole("button", { name: "Continuer mes achats" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
});

test("copie refusée : code sélectionné et message d'erreur visible", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("Permission refusée")) },
    });
  });
  await page.goto("/");
  await frame(page).getByRole("button", { name: "C'est parti !" }).click();
  const shoot = frame(page).getByRole("button", { name: "Tirer le ballon" });
  for (let i = 0; i < 3; i++) {
    await shoot.click();
    if (i < 2) await expect(shoot).toBeEnabled();
  }
  await frame(page).getByRole("button", { name: "Copier le code" }).click();
  await expect(frame(page).getByRole("status")).toContainText("Copie automatique indisponible");
  await expect(frame(page).getByLabel("VOTRE CODE PROMO")).toBeFocused();
  expect(await frame(page).getByLabel("VOTRE CODE PROMO").evaluate((element: HTMLInputElement) => ({
    start: element.selectionStart, end: element.selectionEnd,
  }))).toEqual({ start: 0, end: 8 });
});

test("iframe bloquée : erreur explicite et fermeture disponible", async ({ page }) => {
  await page.route("**/play?**", (route) => route.abort());
  await page.goto("/");
  await expect(close(page)).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Le jeu n'a pas pu se charger" })).toBeVisible({ timeout: 18000 });
  await close(page).click();
  await expect(root(page)).toHaveCount(0);
});

test("messages forgés et origine non autorisée sont refusés", async ({ page, request }) => {
  const denied = await request.get("/api/shops/demo", { headers: { Origin: "https://unauthorized.example" } });
  expect(denied.status()).toBe(403);
  await page.goto("/");
  await expect(close(page)).toBeVisible();
  await page.evaluate(() => {
    window.postMessage({ protocol: "basketball-promo/v1", type: "completed", channel: "fake" }, window.location.origin);
    window.postMessage({ protocol: "basketball-promo/v1", type: "close", channel: "fake" }, window.location.origin);
  });
  await expect(root(page)).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem("basketball-promo:demo:welcome-v1:won"))).toBeNull();
  await close(page).click();
  await page.goto("/play?shop=demo&parent=https%3A%2F%2Funauthorized.example&channel=01234567890123456789012345678901");
  await expect(page.getByRole("heading", { name: "Intégration non autorisée" })).toBeVisible();
});

test("stockage bloqué : avertissement explicite et fonctionnement en mémoire", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (message) => { if (message.type() === "warning") warnings.push(message.text()); });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("Storage blocked"); };
    Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
  });
  await page.goto("/");
  await expect(frame(page).getByRole("button", { name: "C'est parti !" })).toBeEnabled();
  expect(warnings.some((warning) => warning.includes("Stockage indisponible"))).toBe(true);
  await close(page).click();
  await page.getByRole("button", { name: "Tester le mini-jeu" }).click();
  await expect(frame(page).getByRole("button", { name: "C'est parti !" })).toBeEnabled();
});
