import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto("http://127.0.0.1:3000/capture", { waitUntil: "networkidle" });
  await page.getByText("Capture incomplete", { exact: true }).waitFor();
  const value = page.getByLabel("Measured value");
  await value.fill("125.5");
  await value.blur();
  await page.getByLabel("Provenance").selectOption("observed");
  await page.getByLabel("Confidence").selectOption("high");
  await page.getByLabel("Measurement method").fill("Tape measured twice");
  await page.getByLabel("Date observed").fill("2026-10-20");
  await page.getByText("Lock this measurement against accidental edits").click();
  if (!(await page.getByLabel("Measured value").isDisabled())) {
    throw new Error("Capture lock did not prevent editing");
  }

  await page.getByRole("button", { name: "Save locally" }).click();
  await page.reload({ waitUntil: "networkidle" });
  if (!(await page.getByLabel("Measured value").isDisabled())) {
    throw new Error("Capture lock was not restored after reload");
  }
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  if (!download.suggestedFilename().includes("capture")) {
    throw new Error("Capture JSON export filename missing");
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ status: "pass", route: "/capture", localSave: true, lock: true, export: true }));
} finally {
  await browser.close();
}
