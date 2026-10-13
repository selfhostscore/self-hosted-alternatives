// Validate every seed `github` slug resolves — via github.com HEAD (no API quota).
// Run: node scripts/check-repos.ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Seed } from "../src/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(await readFile(join(ROOT, "data", "seed.json"), "utf8")) as Seed;

const repos = [...new Set(seed.tools.flatMap((t) => t.alternatives.map((a) => a.github)))];
console.log(`Checking ${repos.length} unique repos via github.com (no API quota)...`);

const missing: string[] = [];
for (const r of repos) {
  try {
    const res = await fetch(`https://github.com/${r}`, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "seed-check" },
    });
    if (res.status === 404) {
      missing.push(r);
      process.stdout.write("x");
    } else {
      process.stdout.write(".");
    }
  } catch {
    missing.push(`${r} (network error)`);
    process.stdout.write("?");
  }
  await new Promise((res) => setTimeout(res, 80));
}

console.log(`\n\nMissing/invalid (${missing.length}): ${missing.join(", ") || "none — all good"}`);
