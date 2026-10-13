// Merge verified deploy-footprints (from the footprint-verify workflow output)
// back into data/seed.json. Matches by github slug; deterministic; prints a diff.
//
// Run: node scripts/merge-footprint.ts <path-to-workflow-output.json>
// The output file is the workflow's <output-file>; its `.result.verifications`
// holds [{ toolSlug, alternatives: [{ github, database, minRamMB, arm64, deploy, oneClick, confidence, sources, changed }] }].

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Seed } from "../src/types.ts";

const outputPath = process.argv[2];
if (!outputPath) {
  console.error("Usage: node scripts/merge-footprint.ts <workflow-output.json>");
  process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = join(ROOT, "data", "seed.json");

const raw = JSON.parse(await readFile(outputPath, "utf8")) as Record<string, any>;
const verifications: any[] = raw?.result?.verifications ?? raw?.verifications ?? [];
if (!Array.isArray(verifications) || verifications.length === 0) {
  console.error("No `verifications` array found in the output file.");
  process.exit(1);
}

// github slug -> verified record
const vmap = new Map<string, any>();
for (const tool of verifications) {
  for (const a of tool.alternatives ?? []) vmap.set(a.github, a);
}

const seed = JSON.parse(await readFile(SEED_PATH, "utf8")) as Seed;

let updated = 0;
const changes: string[] = [];
const lowConfidence: string[] = [];
const seedSlugs = new Set<string>();

for (const tool of seed.tools) {
  for (const alt of tool.alternatives) {
    seedSlugs.add(alt.github);
    const v = vmap.get(alt.github);
    if (!v) continue;

    const before = JSON.stringify(alt.footprint);
    const next = {
      database: v.database,
      minRamMB: v.minRamMB,
      arm64: v.arm64,
      deploy: v.deploy,
      oneClick: v.oneClick,
    };
    const after = JSON.stringify(next);

    if (before !== after) changes.push(`  ${alt.name.padEnd(18)} ${before}\n     ${" ".repeat(18)}-> ${after}  [${v.confidence}]`);
    if (v.confidence === "low") lowConfidence.push(`${alt.name} (${alt.github})`);

    alt.footprint = next;
    alt.footprintConfidence = v.confidence;
    alt.footprintSources = v.sources;
    updated++;
  }
}

const unmatched = [...vmap.keys()].filter((gh) => !seedSlugs.has(gh));

const totalAlts = seed.tools.reduce((n, t) => n + t.alternatives.length, 0);
const verifiedAlts = seed.tools.reduce(
  (n, t) => n + t.alternatives.filter((a) => a.footprintConfidence).length,
  0,
);
seed.meta.footprintStatus =
  verifiedAlts >= totalAlts
    ? `VERIFIED — all ${totalAlts} alternatives verified vs official docs (footprintConfidence/footprintSources per alt)`
    : `PARTIALLY-VERIFIED — ${verifiedAlts}/${totalAlts} alternatives verified vs official docs; the rest still DRAFT-UNVERIFIED`;

await writeFile(SEED_PATH, JSON.stringify(seed, null, 2) + "\n", "utf8");

console.log(`Merged verified footprint for ${updated} alternatives into seed.json.\n`);
console.log(`Changed (${changes.length}):`);
console.log(changes.join("\n") || "  (none — all drafts matched the verified values)");
if (lowConfidence.length) console.log(`\n⚠ Low-confidence (recheck before publish): ${lowConfidence.join(", ")}`);
if (unmatched.length) console.log(`\n⚠ Verified entries with NO seed match (slug drift?): ${unmatched.join(", ")}`);
