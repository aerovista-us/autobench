import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const response = await page.goto(`${process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000"}/bakeoff`, { waitUntil: "domcontentloaded" });
  if (response?.status() !== 404) {
    throw new Error(`Research-only OpenGeometry route is reachable: HTTP ${response?.status()}`);
  }
  console.log(JSON.stringify({ status: "pass", researchRoute: "/bakeoff", httpStatus: 404 }));
} finally {
  await browser.close();
}
