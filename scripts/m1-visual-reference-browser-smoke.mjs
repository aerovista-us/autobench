import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  const base = process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000";
  await page.goto(`${base}/references/g10-1986?offset=12`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "G10 front-end design reference" }).waitFor();
  const image = page.getByRole("img", { name: /Dark blue 1986 Chevrolet G10 van/ });
  await image.waitFor();
  const size = await image.evaluate(img => ({ width: img.naturalWidth, height: img.naturalHeight }));
  if (size.width !== 790 || size.height !== 527) {
    throw new Error(`Reference image did not load correctly: ${JSON.stringify(size)}`);
  }
  if (!(await page.getByRole("button", { name: "+12 in" }).getAttribute("aria-pressed") === "true")) {
    throw new Error("Reference guide did not initialize from scenario query");
  }
  await page.getByRole("button", { name: "Show design cue: Rounded front wheel opening" }).click();
  await page.getByRole("heading", { name: "Rounded front wheel opening" }).waitFor();
  await page.getByRole("button", { name: "+10 in" }).click();
  await page.getByRole("heading", { name: "Preferred first concept" }).waitFor();
  await page.getByRole("button", { name: "Baseline" }).click();
  await page.getByRole("heading", { name: "Factory-style baseline" }).waitFor();

  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /1986 G10 · visual reference 01/ }).waitFor();
  await page.goto(`${base}/capture`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "1986 G10 styling reference" }).waitFor();

  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({
    status: "pass", imageLoaded: true, scenarioSwitching: true, cueCallouts: true,
    modelLink: true, captureLink: true, stylingOnly: true,
  }));
} finally {
  await browser.close();
}
