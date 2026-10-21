import { chromium } from "playwright";

const baseUrl = process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];

  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto(`${baseUrl}/bakeoff`, { waitUntil: "networkidle", timeout: 60_000 });
  await page
    .getByText("OPEN GEOMETRY PASS", { exact: true })
    .waitFor({ state: "visible", timeout: 60_000 });

  const raw = await page.locator("[data-opengeometry-result]").innerText();
  const result = JSON.parse(raw);

  if (result.status !== "pass") throw new Error("OpenGeometry did not report pass");
  if (Math.abs(result.baseline.metrics.wheelbaseMm - 3175) > 0.05) {
    throw new Error(`Unexpected baseline wheelbase ${result.baseline.metrics.wheelbaseMm}`);
  }
  if (Math.abs(result.axlePlus10.metrics.wheelbaseMm - 3429) > 0.05) {
    throw new Error(`Unexpected moved wheelbase ${result.axlePlus10.metrics.wheelbaseMm}`);
  }
  if (result.baseline.projectionLines <= 0 || result.axlePlus10.projectionLines <= 0) {
    throw new Error("OpenGeometry projection was empty");
  }
  if (result.baseline.bodyStepBytes <= 0 || result.axlePlus10.bodyStepBytes <= 0) {
    throw new Error("OpenGeometry per-solid STEP export was empty");
  }
  if (errors.length) {
    throw new Error(`Browser emitted errors:\n${errors.join("\n")}`);
  }

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
