// Re-verify data/deploy-links.json: every deploy page must still load and still be the right app.
//
//   node scripts/check-deploy-links.ts                     report only
//   node scripts/check-deploy-links.ts --prune             also remove confirmed-dead links from deploy-links.json
//   node scripts/check-deploy-links.ts --report out.md     write a markdown report (used for the GitHub issue)
//   node scripts/check-deploy-links.ts --canary            add one fake dead link to test the alert path end to end
//
// Exit codes: 0 all links OK, 1 dead links found (and pruned with --prune), 2 inconclusive (too many failures at once,
// most likely the platform blocked the checker or was down; nothing is pruned in that case).
// Runs weekly in GitHub Actions (.github/workflows/check-links.yml). A failing page is retried twice with a pause,
// so a single flaky response never removes a link.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "data", "deploy-links.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const RETRY_PAUSES_MS = [5_000, 20_000];
const CONCURRENCY = 4;
const INCONCLUSIVE_RATIO = 0.2; // more than 20% failing at once = treat as an outage or a block, not as dead links

const args = process.argv.slice(2);
const PRUNE = args.includes("--prune");
const CANARY = args.includes("--canary");
const reportIdx = args.indexOf("--report");
const REPORT = reportIdx >= 0 ? args[reportIdx + 1] : "";

type Removed = { slug: string; platform: string; url: string; reason: string; date: string };
type LinksFile = { links: Record<string, Record<string, string>>; _removed?: Removed[]; [k: string]: unknown };
type Job = { slug: string; platform: string; url: string; canary?: boolean };

const data = JSON.parse(await readFile(FILE, "utf8")) as LinksFile;
const jobs: Job[] = [];
for (const [slug, m] of Object.entries(data.links)) for (const [platform, url] of Object.entries(m)) jobs.push({ slug, platform, url });
if (CANARY) jobs.push({ slug: "_canary", platform: "Railway", url: "https://railway.com/deploy/selfhostscore-canary-not-a-template", canary: true });

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function checkOnce(j: Job): Promise<string | null> {
  try {
    const res = await fetch(j.url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" });
    if (res.status !== 200) return `HTTP ${res.status}`;
    const html = await res.text();
    const title = (html.match(/<title>([^<]*)/) ?? [, ""])[1];
    if (/Browse App Marketplace/i.test(title)) return "generic marketplace page (app removed)";
    if (!/Deploy|RepoCloud \|/i.test(title)) return `unexpected page title: ${title.slice(0, 80)}`;
    return null;
  } catch (e) {
    return `network error: ${(e as Error).message}`;
  }
}

async function check(j: Job): Promise<string | null> {
  let err = await checkOnce(j);
  for (const pause of RETRY_PAUSES_MS) {
    if (!err) return null;
    await sleep(pause);
    err = await checkOnce(j);
  }
  return err;
}

const dead: (Job & { reason: string })[] = [];
for (let i = 0; i < jobs.length; i += CONCURRENCY) {
  const batch = jobs.slice(i, i + CONCURRENCY);
  const results = await Promise.all(batch.map(check));
  results.forEach((r, k) => {
    if (r) {
      dead.push({ ...batch[k], reason: r });
      console.log(`DEAD  ${batch[k].slug} ${batch[k].platform}: ${r}  ${batch[k].url}`);
    }
  });
}

const total = jobs.length;
const date = new Date().toISOString().slice(0, 10);
const inconclusive = total > 0 && dead.length / total > INCONCLUSIVE_RATIO;
const real = dead.filter((d) => !d.canary);

let pruned = 0;
if (PRUNE && !inconclusive && real.length) {
  data._removed = data._removed ?? [];
  for (const d of real) {
    if (data.links[d.slug]?.[d.platform]) {
      delete data.links[d.slug][d.platform];
      if (!Object.keys(data.links[d.slug]).length) delete data.links[d.slug];
      data._removed.push({ slug: d.slug, platform: d.platform, url: d.url, reason: d.reason, date });
      pruned++;
    }
  }
  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}

console.log(`${total - dead.length} of ${total} deploy links OK.${inconclusive ? " Inconclusive: too many failures at once, nothing pruned." : ""}${pruned ? ` Pruned ${pruned}.` : ""}`);

if (REPORT) {
  const lines: string[] = [];
  if (inconclusive) {
    lines.push(`### Deploy link check inconclusive (${date})`, "", `${dead.length} of ${total} links failed at once. That usually means a platform was down or blocked the checker, so nothing was removed. The next weekly run will try again.`, "");
  } else if (dead.length) {
    lines.push(`### Dead deploy links found (${date})`, "", `${total - dead.length} of ${total} links are OK. These failed three times in a row:`, "");
    lines.push("| App | Platform | Problem | URL |", "|---|---|---|---|");
    for (const d of dead) lines.push(`| ${d.slug}${d.canary ? " (test entry)" : ""} | ${d.platform} | ${d.reason.replace(/\|/g, "/")} | ${d.url} |`);
    lines.push("");
    lines.push(
      PRUNE && pruned
        ? `Removed from \`data/deploy-links.json\` and redeployed. The chip for that app now opens the platform's general referral page, or disappears if the platform was only listed because of this template. If a project moved its template, add the new URL to \`data/deploy-links.json\`.`
        : PRUNE
          ? "Nothing to remove from the data file (test entries only)."
          : "Not removed (report-only run).",
    );
  } else {
    lines.push(`### All ${total} deploy links OK (${date})`);
  }
  await writeFile(REPORT, lines.join("\n") + "\n", "utf8");
}

process.exit(inconclusive ? 2 : dead.length ? 1 : 0);
