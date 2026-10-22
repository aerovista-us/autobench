import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1660, height: 1120 }, acceptDownloads: true });
page.on("pageerror", error => errors.push(error.message));
page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
// Wait for the *new revision's* exact mesh, not a stale OCCT badge left
// visible before the 120 ms compile debounce / asynchronous kernel queue.
const waitExact = async (previousRevision = null, target = page) => {
  await target.waitForFunction(previous => {
    const badge = document.querySelector('[data-testid="exact-status"]');
    const revision = badge?.getAttribute("data-revision");
    return revision && (previous === null || revision !== previous) &&
      badge?.textContent?.includes("EXACT OCCT");
  }, previousRevision, { timeout: 90_000 });
  return await target.getByTestId("exact-status").getAttribute("data-revision");
};

try {
  await page.goto(base, { waitUntil: "networkidle" });
  let revision = await waitExact();
  await page.getByLabel("Front bumper concept").selectOption("plate-trail");
  revision = await waitExact(revision);
  await page.screenshot({ path: "artifacts/m3-steel-bumper-contoured-body.png", fullPage: true });

  await page.getByLabel("Front bumper concept").selectOption("winch-plate");
  revision = await waitExact(revision);
  await page.getByLabel("Front shock concept").selectOption("remote-reservoir");
  revision = await waitExact(revision);
  await page.getByLabel("Front spring concept").selectOption("heavy-duty-leaf");
  revision = await waitExact(revision);
  await page.getByText("Parts and mount compatibility").waitFor();
  await page.getByText("UNVERIFIED", { exact: true }).waitFor();
  await page.getByLabel("Isolate chassis and suspension CAD").check();
  await page.locator('[data-inspection-mode="chassis"]').waitFor();
  await page.screenshot({ path: "artifacts/m3-winch-reservoir-leaf-inspection.png", fullPage: true });

  const manifest = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export manifest" }).click();
  const download = await manifest;
  const fs = await import("node:fs/promises");
  const parsed = JSON.parse(await fs.readFile(await download.path(), "utf8"));
  if (parsed.conceptOptions?.bumper !== "winch-plate" ||
      parsed.conceptOptions?.shock !== "remote-reservoir" ||
      parsed.conceptOptions?.spring !== "heavy-duty-leaf") {
    throw new Error("Exported manifest lost selected concept options");
  }
  if (!parsed.conceptHistory?.every(c => c.note.includes("Unapproved"))) {
    throw new Error("Concept operation history lacks approval warning");
  }

  await page.getByLabel("Body width").evaluate(element => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, "84");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
  revision = await waitExact(revision);
  const sized = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export design JSON" }).click();
  const sizeManifest = JSON.parse(await fs.readFile(await (await sized).path(), "utf8"));
  if (Math.abs(sizeManifest.parameters.bodyWidthMm - 84 * 25.4) > 0.02) {
    throw new Error("Body width slider did not update canonical design");
  }
  await page.getByLabel("Front bumper concept").selectOption("brush-guard");
  revision = await waitExact(revision);
  await page.screenshot({ path: "artifacts/m3-brush-guard-body-size.png", fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(base, { waitUntil: "networkidle" });
  const mobileRevision = await waitExact(null, mobile);
  await mobile.getByLabel("Front bumper concept").selectOption("plate-trail");
  await waitExact(mobileRevision, mobile);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 2) throw new Error(`Mobile overflow: ${overflow}px`);
  await mobile.screenshot({ path: "artifacts/m3-mobile-upgrades.png", fullPage: true });
  await mobile.close();
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  console.log(JSON.stringify({ status: "pass", contouredBody: true, bumperVariants: true,
    suspensionVariants: true, suspensionInspection: true, sizeControls: true,
    manifestRoundtrip: true, noFitmentClaim: true, mobileOverflow: overflow }));
} finally {
  await browser.close();
}
