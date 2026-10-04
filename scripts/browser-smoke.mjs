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

  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60_000 });

  await page
    .getByText(/EXACT OCCT · [0-9,]+ TRI/)
    .waitFor({ state: "visible", timeout: 60_000 });

  const initialBadge = await page.locator(".viewport-badge").innerText();
  if (!initialBadge.includes("EXACT OCCT")) {
    throw new Error(`Exact kernel did not become active: ${initialBadge}`);
  }

  await page.getByRole("button", { name: "Run candidate" }).click();

  await page
    .getByText("+10.0 in", { exact: true })
    .waitFor({ state: "visible", timeout: 10_000 });

  await page
    .getByText(/EXACT OCCT · [0-9,]+ TRI/)
    .waitFor({ state: "visible", timeout: 60_000 });

  const finalBadge = await page.locator(".viewport-badge").innerText();
  const wheelbase = await page
    .locator(".metric")
    .filter({ hasText: "Wheelbase" })
    .innerText();

  if (!wheelbase.includes("135.0 in")) {
    throw new Error(`Expected +10 in wheelbase result, got: ${wheelbase}`);
  }

  if (errors.length) {
    throw new Error(`Browser emitted errors:\n${errors.join("\n")}`);
  }

  console.log(
    JSON.stringify(
      {
        status: "pass",
        initialBadge,
        finalBadge,
        wheelbase,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
