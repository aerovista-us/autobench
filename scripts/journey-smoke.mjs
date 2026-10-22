import { chromium } from "playwright";

const base = process.env.AUTOBENCH_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.getByRole("slider", { name: "Front axle offset" }).fill("8");
  await page.getByText("LOCAL DRAFT").waitFor();
  await page.goto(base + "/model");
  const model = page.getByRole("region", { name: "Saved vehicle design" });
  await model.getByText("Front axle offset:").waitFor();
  if (!(await model.innerText()).includes("8.0 in")) throw Error("MODEL lost selected axle offset");
  await page.goto(base + "/validate");
  const validate = page.getByRole("region", { name: "Saved vehicle design" });
  if (!(await validate.innerText()).includes("8.0 in")) throw Error("VALIDATE lost selected axle offset");
  await page.reload();
  if (!(await validate.innerText()).includes("8.0 in")) throw Error("Reload lost saved candidate");
  if (errors.length) throw Error("Browser errors: " + errors.join("; "));
  console.log("PASS: Modify → Model → Validate → reload retains selected revision");
} finally { await browser.close(); }
