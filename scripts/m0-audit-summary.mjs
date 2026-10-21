import { readFile } from "node:fs/promises";

const path = "artifacts/npm-audit-production.json";
const audit = JSON.parse(await readFile(path, "utf8"));
const counts = audit.metadata?.vulnerabilities ?? {};
const issues = Object.entries(audit.vulnerabilities ?? {}).map(([name, entry]) => ({
  name,
  severity: entry.severity,
  isDirect: entry.isDirect,
  via: (entry.via ?? []).map(v => typeof v === "string" ? v : {name:v.name, title:v.title, range:v.range, url:v.url}),
  range: entry.range,
  fixAvailable: entry.fixAvailable,
}));
console.log("PRODUCTION AUDIT SUMMARY "+JSON.stringify({counts,issues},null,2));
if ((counts.critical ?? 0) > 0 || (counts.high ?? 0) > 0) {
  throw new Error("Production audit gate failed: high/critical vulnerabilities detected.");
}
