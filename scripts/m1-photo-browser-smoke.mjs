import { chromium } from "playwright";
import { Buffer } from "node:buffer";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto(`${process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000"}/capture`, { waitUntil: "networkidle" });
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#809aab";
    ctx.fillRect(0, 0, 800, 400);
    ctx.fillStyle = "#142a3b";
    ctx.fillRect(40, 70, 720, 250);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Import photo files").setInputFiles([{
    name: "pops-side-test.png",
    mimeType: "image/png",
    buffer: Buffer.from(base64, "base64"),
  }]);
  const img = page.getByRole("img", { name: "Calibration image: pops-side-test.png" });
  await img.waitFor({ timeout: 12000 });
  await page.getByLabel("Marker label").selectOption("SCALE-A");
  await img.click({ position: { x: 120, y: 120 } });
  await page.getByLabel("Marker label").selectOption("SCALE-B");
  await img.click({ position: { x: 320, y: 120 } });
  await page.getByLabel("First scale marker").selectOption({ label: "SCALE-A" });
  await page.getByLabel("Second scale marker").selectOption({ label: "SCALE-B" });
  await page.getByLabel("Known marker distance").fill("20");
  await page.getByRole("button", { name: "Set photo scale" }).click();
  await page.getByText("Image-plane scale:", { exact: false }).waitFor();
  const result = await page.locator(".photo-scale-result").innerText();
  if (!result.includes("2.540 mm/px")) throw new Error(`Unexpected image scale: ${result}`);
  await page.reload({ waitUntil: "networkidle" });
  await img.waitFor({ timeout: 12000 });
  const restored = await page.locator(".photo-scale-result").innerText();
  if (!restored.includes("2.540 mm/px")) throw new Error("Image scale did not survive reload");

  const json = await page.evaluate(() => localStorage.getItem("autobench:pops-van:capture:v1"));
  if (!json) throw new Error("Capture metadata did not autosave");
  const secondContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const transfer = await secondContext.newPage();
  transfer.on("pageerror", error => errors.push(error.message));
  await transfer.goto(`${process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000"}/capture`, { waitUntil: "networkidle" });
  await transfer.getByLabel("Import capture JSON").setInputFiles([{
    name: "pops-van-capture-v1.json", mimeType: "application/json", buffer: Buffer.from(json),
  }]);
  await transfer.getByText("Image not available in this browser", { exact: false }).waitFor();
  await transfer.getByLabel("Attach image").setInputFiles([{
    name: "wrong-photo.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64"),
  }]);
  await transfer.getByText("Reattachment rejected:", { exact: false }).waitFor();
  await transfer.getByLabel("Attach image").setInputFiles([{
    name: "pops-side-test.png", mimeType: "image/png", buffer: Buffer.from(base64, "base64"),
  }]);
  await transfer.getByRole("img", { name: "Calibration image: pops-side-test.png" }).waitFor({ timeout: 12000 });
  const reattachedScale = await transfer.locator(".photo-scale-result").innerText();
  if (!reattachedScale.includes("2.540 mm/px")) {
    throw new Error("Reattaching the original did not preserve scale and markers");
  }
  await secondContext.close();
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  await page.screenshot({ path: "artifacts/m1-photo-calibration.png", fullPage: true });
  console.log(JSON.stringify({
    status: "pass", imageImport: true, localBlobPersistence: true,
    namedMarkers: true, imagePlaneScale: "2.540 mm/px", noNetworkUpload: true,
    reattachmentPreservesCalibration: true, mismatchedImageRejected: true,
  }));
} finally {
  await browser.close();
}
