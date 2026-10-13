// Enricher: reads data/seed.json, pulls live GitHub data for every alternative,
// computes the Self-Host Health Score, writes data/enriched.json.
//
// Zero-dependency: run with `node scripts/enrich.ts` (Node >= 23.6 strips TS natively).
// Set GITHUB_TOKEN to get 5,000 req/h (vs 60/h unauthenticated) and release data.
//
//   PowerShell:  $env:GITHUB_TOKEN="ghp_..."; node scripts/enrich.ts
//   bash:        GITHUB_TOKEN=ghp_... node scripts/enrich.ts

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeHealth, healthLabel } from "../src/healthScore.ts";
import type {
  Seed,
  GithubData,
  EnrichedAlternative,
  EnrichedTool,
  Enriched,
} from "../src/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = join(ROOT, "data", "seed.json");
const OUT_PATH = join(ROOT, "data", "enriched.json");

let TOKEN: string | undefined = process.env.GITHUB_TOKEN;
let WITH_RELEASES = false; // set true once a token is resolved (enables release fetch + 5,000/h)
const API = "https://api.github.com";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Retry on transient failures: network errors ("fetch failed" on CI runners), 5xx, and
// secondary rate limits (403/429 with retry-after or remaining=0). Backoff capped at 90s.
const RETRY_DELAYS_MS = [1000, 3000, 8000, 20000];
async function ghFetch(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "selfhost-directory-enricher",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  for (let attempt = 0; ; attempt++) {
    const last = attempt >= RETRY_DELAYS_MS.length;
    try {
      const res = await fetch(API + path, { headers });
      const limited = (res.status === 403 || res.status === 429) && (!!res.headers.get("retry-after") || res.headers.get("x-ratelimit-remaining") === "0");
      if (!(res.status >= 500 || limited) || last) return res;
      const retryAfter = Number(res.headers.get("retry-after")) * 1000 || 0;
      const untilReset = Number(res.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
      const wait = Math.min(Math.max(retryAfter, untilReset > 0 ? untilReset : 0, RETRY_DELAYS_MS[attempt]), 90_000);
      console.error(`
  ↻ HTTP ${res.status} on ${path}; retry ${attempt + 1}/${RETRY_DELAYS_MS.length} in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
    } catch (err) {
      if (last) throw err;
      const wait = RETRY_DELAYS_MS[attempt];
      console.error(`
  ↻ network error on ${path} (${(err as Error).message}); retry ${attempt + 1}/${RETRY_DELAYS_MS.length} in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function fetchRepo(ownerRepo: string): Promise<GithubData> {
  const fetchedAt = new Date().toISOString();
  const res = await ghFetch(`/repos/${ownerRepo}`);

  if (res.status === 404) return { found: false, fetchedAt };
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    throw new Error(
      `GitHub rate-limited (${res.status}, remaining=${remaining}) on ${ownerRepo}. ` +
        `Set GITHUB_TOKEN for 5,000 req/h.`,
    );
  }
  if (!res.ok) return { found: false, fetchedAt };

  const r = (await res.json()) as Record<string, any>;
  const data: GithubData = {
    found: true,
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    language: r.language ?? null,
    license: r.license?.spdx_id ?? null,
    pushedAt: r.pushed_at ?? null,
    createdAt: r.created_at ?? null,
    archived: !!r.archived,
    latestReleaseTag: null,
    latestReleaseAt: null,
    fetchedAt,
  };

  if (WITH_RELEASES && !data.archived) {
    const rel = await ghFetch(`/repos/${ownerRepo}/releases/latest`);
    if (rel.ok) {
      const j = (await rel.json()) as Record<string, any>;
      data.latestReleaseTag = j.tag_name ?? null;
      data.latestReleaseAt = j.published_at ?? null;
    }
  }
  return data;
}

async function main(): Promise<void> {
  // token resolution order: env var → gitignored .github-token file → anonymous
  if (!TOKEN) {
    try {
      const t = (await readFile(join(ROOT, ".github-token"), "utf8")).trim();
      if (t) TOKEN = t;
    } catch {
      /* no token file — fall back to anonymous (60/h) */
    }
  }
  WITH_RELEASES = !!TOKEN;

  const summaryOnly = process.argv.includes("--summary");
  const append = process.argv.includes("--append");
  const slugIdx = process.argv.indexOf("--slugs");
  const onlySlugs =
    slugIdx >= 0 && process.argv[slugIdx + 1]
      ? new Set(process.argv[slugIdx + 1].split(",").map((s) => s.trim()))
      : null;
  const seed = JSON.parse(await readFile(SEED_PATH, "utf8")) as Seed;
  const tools = onlySlugs ? seed.tools.filter((t) => onlySlugs.has(t.slug)) : seed.tools;
  const nowMs = Date.now();

  let total = 0;
  let found = 0;
  const missing: string[] = [];
  const enrichedTools: EnrichedTool[] = [];

  console.log(
    `Enriching ${tools.length}${onlySlugs ? "" : "/" + seed.tools.length} tools — auth: ${TOKEN ? "token" : "anonymous (60/h)"}` +
      `${WITH_RELEASES ? " + releases" : ""}`,
  );

  for (const tool of tools) {
    const alts: EnrichedAlternative[] = [];
    for (const alt of tool.alternatives) {
      total++;
      let gh: GithubData;
      try {
        gh = await fetchRepo(alt.github);
      } catch (err) {
        console.error(`\n  ✗ ${(err as Error).message}`);
        console.error(`  Partial results so far will NOT be written. Aborting.`);
        process.exit(2);
      }
      if (gh.found) found++;
      else missing.push(alt.github);

      const { score, breakdown } = computeHealth(gh, nowMs);
      alts.push({ ...alt, gh, healthScore: score, healthBreakdown: breakdown });
      process.stdout.write(".");
      await sleep(120); // polite
    }
    // rank alternatives by health within each page
    alts.sort((a, b) => b.healthScore - a.healthScore);
    enrichedTools.push({ ...tool, alternatives: alts });
  }

  let finalTools = enrichedTools;
  if (append) {
    try {
      const prev = JSON.parse(await readFile(OUT_PATH, "utf8")) as Enriched;
      const bySlug = new Map(prev.tools.map((t) => [t.slug, t]));
      for (const t of enrichedTools) bySlug.set(t.slug, t); // overlay/add
      finalTools = seed.tools.map((st) => bySlug.get(st.slug)).filter(Boolean) as EnrichedTool[];
    } catch {
      /* no existing enriched.json — write just the new ones */
    }
  }

  const out: Enriched = {
    meta: seed.meta,
    generatedAt: new Date(nowMs).toISOString(),
    tools: finalTools,
  };

  if (!summaryOnly) {
    await writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  }

  // ---- summary ----
  console.log(`\n\n=== Enrichment summary ===`);
  console.log(`Tools enriched: ${enrichedTools.length}${append ? `  (file total: ${finalTools.length})` : ""}`);
  console.log(`Alternatives:   ${total}  (found ${found}, missing ${missing.length})`);
  if (missing.length) console.log(`Missing repos: ${missing.join(", ")}`);

  const ranked = finalTools
    .flatMap((t) => t.alternatives)
    .filter((a) => a.gh.found)
    .sort((a, b) => b.healthScore - a.healthScore);

  console.log(`\nTop 10 by Self-Host Health Score:`);
  for (const a of ranked.slice(0, 10)) {
    const stars = a.gh.stars?.toLocaleString() ?? "?";
    console.log(
      `  ${String(a.healthScore).padStart(3)}  ${healthLabel(a.healthScore).padEnd(9)} ` +
        `${a.name.padEnd(16)} ★${stars}  ${a.gh.language ?? ""}`,
    );
  }
  if (!summaryOnly) console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
