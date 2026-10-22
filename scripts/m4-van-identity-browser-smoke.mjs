import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";

const base = process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1620, height: 1080 }, acceptDownloads: true });
page.on("pageerror", error => errors.push(error.message));
page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
const exact = async (previous = null, target = page) => {
  await target.waitForFunction(last => {
    const badge = document.querySelector('[data-testid="exact-status"]');
    const revision = badge?.getAttribute("data-revision");
    return revision && (last === null || revision !== last) &&
      badge?.textContent?.includes("EXACT OCCT");
  }, previous, { timeout: 90_000 });
  return await target.getByTestId("exact-status").getAttribute("data-revision");
};
try {
  await page.goto(base, { waitUntil: "networkidle" });
  let rev = await exact();
  if (!(await page.getByRole("button", { name: "Classic van" }).getAttribute("aria-pressed") === "true")) {
    throw new Error("Default is not classic conversion van");
  }
  await page.screenshot({ path: "artifacts/m4-classic-van-front.png", fullPage: true });
  await page.getByRole("button", { name: "SIDE", exact: true }).click();
  await page.screenshot({ path: "artifacts/m4-classic-van-side.png", fullPage: true });
  await page.getByRole("button", { name: "3/4 REAR" }).click();
  await page.screenshot({ path: "artifacts/m4-classic-van-rear.png", fullPage: true });

  await page.getByRole("button", { name: "Cargo", exact: true }).click();
  rev = await exact(rev);
  if (await page.getByLabel("Side window configuration").inputValue() !== "cargo") {
    throw new Error("Cargo profile not reflected in glazing selector");
  }
  await page.getByRole("button", { name: "Camper", exact: true }).click();
  rev = await exact(rev);
  await page.getByRole("button", { name: "3/4 FRONT" }).click();
  await page.screenshot({ path: "artifacts/m4-camper-portholes-rack.png", fullPage: true });

  await page.getByRole("button", { name: "Expedition", exact: true }).click();
  rev = await exact(rev);
  await page.getByRole("button", { name: "3/4 REAR" }).click();
  await page.screenshot({ path: "artifacts/m4-expedition-spare-rack.png", fullPage: true });
  const exportWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export manifest" }).click();
  const manifest = JSON.parse(await readFile(await (await exportWait).path(), "utf8"));
  const required = { sideGlass: "conversion", roofRack: true, sideSteps: true,
    rearSpare: true, auxiliaryLights: true, twoTone: true };
  for (const [key, value] of Object.entries(required)) {
    if (manifest.conceptOptions?.[key] !== value) {
      throw new Error(`Manifest lost expedition ${key}`);
    }
  }
  if (!manifest.conceptHistory?.every(c => c.note.includes("Unapproved"))) {
    throw new Error("Concept history missing provisional safety label");
  }

  await page.getByLabel("Rear-mounted spare concept").uncheck();
  rev = await exact(rev);
  if (await page.getByRole("button", { name: "Expedition" }).getAttribute("aria-pressed") === "true") {
    throw new Error("Custom edit incorrectly displays Expedition as selected");
  }
  await page.getByRole("button", { name: "TOP" }).click();
  await page.screenshot({ path: "artifacts/m4-custom-top.png", fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("pageerror", error => errors.push(error.message));
  await mobile.goto(base, { waitUntil: "networkidle" });
  const mobileRev = await exact(null, mobile);
  await mobile.getByRole("button", { name: "Expedition", exact: true }).click();
  await exact(mobileRev, mobile);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 2) throw new Error(`Mobile overflow ${overflow}px`);
  await mobile.screenshot({ path: "artifacts/m4-mobile-expedition.png", fullPage: true });
  await mobile.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ status: "pass", classicDefault: true, fourProfiles: true,
    viewAngles: ["front", "side", "rear", "top"], exactRevisionChecks: true,
    customAccessories: true, manifestRoundtrip: true, mobileOverflow: overflow }));
} finally {
  await browser.close();
}
