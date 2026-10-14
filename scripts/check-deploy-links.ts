// Re-verify data/deploy-links.json: every deploy page must still load and still be the right app.
// Run: node scripts/check-deploy-links.ts   (exit code 1 if any link is dead or redirected to a generic page)
// Not part of CI on purpose: third-party sites rate-limit and flake; run it by hand every few weeks.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";

type Links = { links: Record<string, Record<string, string>> };
const data = JSON.parse(await readFile(join(ROOT, "data", "deploy-links.json"), "utf8")) as Links;

const jobs: { slug: string; platform: string; url: string }[] = [];
for (const [slug, m] of Object.entries(data.links)) for (const [platform, url] of Object.entries(m)) jobs.push({ slug, platform, url });

async function check(j: { slug: string; platform: string; url: string }): Promise<string | null> {
  try {
    const res = await fetch(j.url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (res.status !== 200) return `HTTP ${res.status}`;
    const html = await res.text();
    const title = (html.match(/<title>([^<]*)/) ?? [, ""])[1];
    if (/Browse App Marketplace/i.test(title)) return "generic marketplace page (app removed?)";
    if (!/Deploy|RepoCloud \|/i.test(title)) return `unexpected title: ${title.slice(0, 80)}`;
    return null;
  } catch (e) {
    return `network error: ${(e as Error).message}`;
  }
}

let bad = 0;
const CONCURRENCY = 6;
for (let i = 0; i < jobs.length; i += CONCURRENCY) {
  const batch = jobs.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(check));
  results.forEach((r, k) => {
    if (r) {
      bad++;
      console.log(`DEAD  ${batch[k].slug} ${batch[k].platform}: ${r}  ${batch[k].url}`);
    }
  });
}
console.log(`${jobs.length - bad} of ${jobs.length} deploy links OK.`);
process.exit(bad ? 1 : 0);
