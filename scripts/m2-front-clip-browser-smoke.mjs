import { chromium } from "playwright";
import { readFile, stat } from "node:fs/promises";

const base = process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000";
const baseline = JSON.parse(await readFile(new URL("../data/pops-van.baseline.json", import.meta.url), "utf8"));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1050 }, acceptDownloads: true });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

const fixture = (mismatch = false) => ({
  schemaVersion: 1, vehicleId: baseline.id, updatedAt: "2026-10-21T00:00:00.000Z",
  measurements: Object.entries(baseline.parameters)
    .filter(([id]) => id !== "frontAxleOffsetMm")
    .map(([id, value]) => ({
      id, label: id, valueMm: mismatch && id === "bodyWidthMm" ? value + 250 : value,
      toleranceMm: 5, provenance: "observed", confidence: "verified",
      method: "TEST FIXTURE ONLY — not real measurement", notes: "",
      source: "automated browser fixture", observedAt: "2026-10-21", locked: true,
    })),
  photos: ["driver-side", "front", "rear"].map((view, index) => ({
    id: `fixture-${index}`, view, reference: `TEST-FIXTURE-${index}`, notes: "",
  })),
});

try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByText(/EXACT OCCT · [0-9,]+ TRI/).waitFor({ timeout: 90_000 });
  await page.getByRole("heading", { name: /G10 body · hood · fenders|G-series van · glazing · doors/ }).waitFor();
  await page.getByText("BLOCKED · NO COMPLETE MEASUREMENTS").waitFor();
  await page.getByRole("button", { name: "Axle +10\"" }).click();
  await page.getByText("+10.0 in", { exact: true }).waitFor();
  await page.getByText(/EXACT OCCT · [0-9,]+ TRI/).waitFor({ timeout: 90_000 });

  const reviewDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export geometry review" }).click();
  const reviewFile = await reviewDownload;
  if (!reviewFile.suggestedFilename().startsWith("PROVISIONAL-")) {
    throw new Error("Unapproved geometry review did not retain provisional label");
  }

  const stepDownload = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: "Export provisional STEP" }).click();
  const stepFile = await stepDownload;
  const stepPath = await stepFile.path();
  if (!stepFile.suggestedFilename().startsWith("PROVISIONAL-") ||
      !stepFile.suggestedFilename().endsWith(".step") ||
      !stepPath || (await stat(stepPath)).size < 100_000) {
    throw new Error("Provisional exact STEP download is missing or unexpectedly small");
  }

  const file = page.getByLabel("Compare capture JSON");
  await file.setInputFiles({ name: "fixture-capture.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture())) });
  await page.getByText("READY FOR HUMAN REVIEW · NOT APPROVED").waitFor();
  await file.setInputFiles({ name: "mismatch-capture.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture(true))) });
  await page.getByText("DIMENSION MISMATCH").waitFor();
  await page.getByText("bodyWidthMm", { exact: true }).waitFor();

  // Reset to no capture before screenshot: do not present synthetic data as real.
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("BLOCKED · NO COMPLETE MEASUREMENTS").waitFor();
  await page.getByRole("button", { name: "Axle +10\"" }).click();
  await page.getByText("+10.0 in", { exact: true }).waitFor();
  await page.getByText(/EXACT OCCT · [0-9,]+ TRI/).waitFor({ timeout: 90_000 });
  await page.screenshot({ path: "artifacts/m2-g10-front-clip.png", fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(base, { waitUntil: "networkidle" });
  await mobile.getByRole("heading", { name: /G10 body · hood · fenders|G-series van · glazing · doors/ }).waitFor();
  await mobile.getByText(/EXACT OCCT · [0-9,]+ TRI/).waitFor({ timeout: 90_000 });
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 2) throw new Error(`Mobile horizontal overflow: ${overflow}px`);
  await mobile.screenshot({ path: "artifacts/m2-g10-front-clip-mobile.png", fullPage: true });
  await mobile.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({
    status: "pass", exactStyledViewport: true, frontClipReview: true,
    noCaptureFailClosed: true, fakeFixtureReview: true, fakeFixtureMismatch: true,
    provisionalExport: true, screenshot: "artifacts/m2-g10-front-clip.png",
  }));
} finally {
  await browser.close();
}
