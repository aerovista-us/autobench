import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

async function sizeOf(path) {
  let info;
  try {
    info = await stat(path);
  } catch {
    return 0;
  }
  if (info.isFile()) return info.size;
  if (!info.isDirectory()) return 0;

  let total = 0;
  for (const entry of await readdir(path)) {
    total += await sizeOf(join(path, entry));
  }
  return total;
}

async function largestFiles(path, limit = 12) {
  const files = [];

  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const info = await stat(full);
        files.push({ path: full, bytes: info.size });
      }
    }
  }

  await walk(path);
  return files.sort((a, b) => b.bytes - a.bytes).slice(0, limit);
}

const paths = {
  "occt-wasm": "node_modules/occt-wasm",
  brepjs: "node_modules/brepjs",
  replicad: "node_modules/replicad",
  "replicad-opencascadejs": "node_modules/replicad-opencascadejs",
  opengeometry: "node_modules/opengeometry",
  "next-client-chunks": ".next/static/chunks",
};

const sizes = {};
for (const [name, path] of Object.entries(paths)) {
  sizes[name] = await sizeOf(path);
}

const report = {
  generatedAt: new Date().toISOString(),
  note: "Installed package footprint and built client chunk footprint. This is not transferred-byte or runtime-memory benchmarking.",
  bytes: sizes,
  largestClientChunks: await largestFiles(".next/static/chunks"),
};

await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/m0-runtime-footprint.json",
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));
