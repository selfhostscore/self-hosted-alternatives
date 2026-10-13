// Zero-dep static site generator. Reads data/enriched.json → writes dist/.
// Run: node scripts/build-site.ts   (SITE_URL default selfhostscore.com)
//
// Output: index.html, alternatives/<tool>/, can-i-run/, collections/<slug>/,
//   api/tools.json (machine-readable feed), llms.txt, awesome.md (GitHub export),
//   styles.css, app.js, favicon.svg, og.png (from public/), robots.txt, sitemap.xml

import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { healthLabel } from "../src/healthScore.ts";
import type { Enriched, EnrichedTool, EnrichedAlternative } from "../src/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data", "enriched.json");
const OUT = join(ROOT, "dist");
const SITE_URL = (process.env.SITE_URL ?? "https://selfhostscore.com").replace(/\/$/, "");
const SITE_NAME = "SelfHostScore";

// ---------- helpers ----------
const esc = (s: string): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const nowMs = Date.now();

function rel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = Math.floor((nowMs - Date.parse(iso)) / 86_400_000);
  if (Number.isNaN(d)) return "—";
  if (d <= 0) return "today";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${(d / 365).toFixed(1)}y ago`;
}

function healthClass(s: number): string {
  if (s >= 80) return "h-thriving";
  if (s >= 60) return "h-healthy";
  if (s >= 40) return "h-steady";
  if (s >= 20) return "h-risk";
  return "h-dormant";
}

// ---------- embeddable Self-Host Score badge (maintainer growth loop) ----------
const BADGE_LABEL = "self-host score";
function badgeColor(s: number): { hex: string; name: string } {
  if (s >= 80) return { hex: "#4c1", name: "brightgreen" };
  if (s >= 60) return { hex: "#97ca00", name: "green" };
  if (s >= 40) return { hex: "#dfb317", name: "yellow" };
  if (s >= 20) return { hex: "#fe7d37", name: "orange" };
  return { hex: "#e05d44", name: "red" };
}
const badgeMessage = (a: EnrichedAlternative): string => `${a.healthScore} · ${healthLabel(a.healthScore)}`;
/** Shields.io "endpoint" schema: https://img.shields.io/endpoint?url=<this file> */
const badgeJson = (a: EnrichedAlternative): string =>
  JSON.stringify({ schemaVersion: 1, label: BADGE_LABEL, message: badgeMessage(a), color: badgeColor(a.healthScore).name, cacheSeconds: 86400 });
/** Self-contained flat SVG badge (no third-party dependency), ~shields look. */
function badgeSvg(a: EnrichedAlternative): string {
  const label = BADGE_LABEL, msg = badgeMessage(a), color = badgeColor(a.healthScore).hex;
  const w = (t: string): number => Math.round(t.length * 6.4 + 12);
  const lw = w(label), mw = w(msg), tw = lw + mw;
  const t = (x: number, txt: string): string =>
    `<text x="${x}" y="15" fill="#010101" fill-opacity=".3">${esc(txt)}</text><text x="${x}" y="14">${esc(txt)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="20" role="img" aria-label="${esc(label)}: ${esc(msg)}"><title>${esc(label)}: ${esc(msg)}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${tw}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${mw}" height="20" fill="${color}"/><rect width="${tw}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">${t(lw / 2, label)}${t(lw + mw / 2, msg)}</g></svg>`;
}
const badgeMarkdown = (a: EnrichedAlternative, toolSlug: string): string =>
  `[![Self-Host Score](${SITE_URL}/api/badge/${a.slug}.svg)](${SITE_URL}/alternatives/${toolSlug}/)`;
function badgeSection(tool: EnrichedTool): string {
  const rows = tool.alternatives
    .map((a) => `<div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin:.45rem 0"><img src="/api/badge/${esc(a.slug)}.svg" alt="${esc(a.name)} Self-Host Score badge" height="20" loading="lazy"><strong>${esc(a.name)}</strong><code style="font-size:.78rem;word-break:break-all;user-select:all">${esc(badgeMarkdown(a, tool.slug))}</code></div>`)
    .join("");
  return `<details class="embed"><summary>🏷️ Maintain one of these? Add the live Self-Host Score badge to your README</summary>
<p class="muted sm">Free, no sign-up, refreshed daily from the GitHub API. Click a snippet to select it, paste into your README. Prefer Shields? Use <code>https://img.shields.io/endpoint?url=${SITE_URL}/api/badge/&lt;slug&gt;.json</code>.</p>
${rows}</details>`;
}

const stars = (n: number | undefined): string =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const NO_DB = /^(none|no |no-|no external|no traditional|file-based|embedded)/i;
const isNoDb = (db: string): boolean => NO_DB.test(db) || /no external db|content-addressable/i.test(db);
const dbShort = (db: string): string => {
  if (isNoDb(db)) return "none / embedded";
  let s = db.split(" (")[0].split(/[.;\n]/)[0].trim();
  if (s.length > 26) s = s.slice(0, 24).trim() + "…";
  return s;
};
const dbProse = (db: string): string => (isNoDb(db) ? "no external database" : dbShort(db));
const lic = (x: string | null | undefined): string => (!x || x === "NOASSERTION" ? "" : x);

function ramCell(a: EnrichedAlternative): string {
  const mb = a.footprint.minRamMB;
  if (!mb || mb <= 0) return '<span class="muted">—</span>';
  const est = a.footprintConfidence && a.footprintConfidence !== "high";
  return est
    ? `~${mb} MB <span class="est" title="estimated — not stated in official docs">est</span>`
    : `${mb} MB`;
}

// ---- offers ----
const OFFERS: Record<string, string> = {};
const MANAGED: { name: string; url: string }[] = [];
try {
  const o = JSON.parse(await readFile(join(ROOT, "data", "offers.json"), "utf8")) as { partners?: any[] };
  for (const p of o.partners ?? []) {
    if (p?.name && p?.url) OFFERS[String(p.name).toLowerCase()] = p.url;
    if (p?.managed && p?.name && p?.url) MANAGED.push({ name: p.name, url: p.url });
  }
} catch {
  /* no offers file */
}

const oneClickChips = (arr: string[]): string =>
  arr.length
    ? arr
        .map((x) => {
          const short = x.split(" (")[0];
          const u = OFFERS[short.toLowerCase()] ?? OFFERS[x.toLowerCase()];
          return u
            ? `<a class="chip ok" href="${esc(u)}" rel="sponsored nofollow" title="${esc(x)}">${esc(short)} ↗</a>`
            : `<span class="chip ok" title="${esc(x)}">${esc(short)}</span>`;
        })
        .join(" ")
    : '<span class="muted">—</span>';

const ctaBox = (): string => {
  if (!MANAGED.length) return "";
  const links = MANAGED.slice(0, 4)
    .map((p) => `<a href="${esc(p.url)}" rel="sponsored nofollow">${esc(p.name)} ↗</a>`)
    .join(" · ");
  return `<aside class="cta"><strong>Don't want to run a server?</strong> Deploy apps like these in one click on managed open-source hosting: ${links}. <span class="muted sm">(sponsored)</span></aside>`;
};

// flatten alternatives with their tool context (for matcher feed + collections)
type FlatAlt = { cat: string; tool: string; toolSlug: string; a: EnrichedAlternative };
const flatten = (data: Enriched): FlatAlt[] =>
  data.tools.flatMap((t) => t.alternatives.map((a) => ({ cat: t.category, tool: t.name, toolSlug: t.slug, a })));

// ---------- data-grounded synthesis + quotable quick-answer (AEO) ----------
function synthesize(tool: EnrichedTool): string {
  const alts = tool.alternatives.filter((a) => a.gh.found);
  if (!alts.length) return "";
  const top = alts[0];
  const withRam = alts.filter((a) => a.footprint.minRamMB > 0);
  const lightest = withRam.slice().sort((a, b) => a.footprint.minRamMB - b.footprint.minRamMB)[0];
  const pi = alts.filter((a) => a.footprint.arm64);
  const oneClick = alts.filter((a) => a.footprint.oneClick.length);
  const parts: string[] = [];
  parts.push(
    `Among <strong>${alts.length}</strong> self-hostable open-source ${esc(tool.name)} alternatives tracked here, <strong>${esc(top.name)}</strong> currently leads on the Self-Host Health Score (${top.healthScore}/100, ${stars(top.gh.stars)}★, last commit ${rel(top.gh.pushedAt)}).`,
  );
  if (lightest)
    parts.push(
      `For a Raspberry Pi or low-RAM VPS, <strong>${esc(lightest.name)}</strong> is the lightest at ~${lightest.footprint.minRamMB} MB (${esc(dbProse(lightest.footprint.database))}).`,
    );
  if (pi.length) parts.push(`${pi.length} publish official ARM64 images (Raspberry Pi / Apple Silicon).`);
  if (oneClick.length)
    parts.push(
      `${oneClick.length} offer a one-click deploy (e.g. ${esc([...new Set(oneClick.flatMap((a) => a.footprint.oneClick.map((x) => x.split(" (")[0])))].slice(0, 4).join(", "))}).`,
    );
  return parts.join(" ");
}

// short, lift-ready facts for LLM answer engines
function quickAnswer(tool: EnrichedTool): string {
  const alts = tool.alternatives.filter((a) => a.gh.found);
  if (!alts.length) return "";
  const top = alts[0];
  const withRam = alts.filter((a) => a.footprint.minRamMB > 0).sort((a, b) => a.footprint.minRamMB - b.footprint.minRamMB);
  const lightest = withRam[0];
  const pi = alts.filter((a) => a.footprint.arm64).map((a) => a.name);
  const items: string[] = [];
  items.push(`<li><strong>Best overall:</strong> ${esc(top.name)} — the most actively maintained self-hostable ${esc(tool.name)} alternative (health ${top.healthScore}/100).</li>`);
  if (lightest)
    items.push(`<li><strong>Lightest:</strong> ${esc(lightest.name)} runs in about ${lightest.footprint.minRamMB} MB RAM (${esc(dbProse(lightest.footprint.database))}).</li>`);
  if (pi.length)
    items.push(`<li><strong>Raspberry Pi:</strong> ${esc(pi.slice(0, 5).join(", "))} publish official ARM64 images.</li>`);
  return `<div class="quick"><div class="qh">Quick answer</div><ul>${items.join("")}</ul></div>`;
}

function relatedTools(tool: EnrichedTool, all: EnrichedTool[]): EnrichedTool[] {
  const others = all.filter((t) => t.slug !== tool.slug);
  const same = others.filter((t) => t.category === tool.category);
  const rest = others.filter((t) => t.category !== tool.category);
  return [...same, ...rest].slice(0, 6);
}

// ---------- page chrome ----------
function head(title: string, desc: string, canonical: string, jsonLd: object | object[]): string {
  const ld = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:site_name" content="${SITE_NAME}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:image" content="${SITE_URL}/og.png">
<link rel="stylesheet" href="/styles.css">
<script src="/app.js" defer></script>
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n")}
</head>
<body>
<header class="site"><a class="brand" href="/">✓ ${esc(SITE_NAME)}</a><nav class="nav"><a href="/can-i-run/">What can I run?</a><a href="/collections/raspberry-pi/">Collections</a><a href="/sponsor/">Sponsor</a></nav><span class="tag">verified deploy footprint</span></header>
<main>`;
}

const foot = (updated: string): string => `</main>
<footer>
<p>Health Score = activity + release recency + maturity (stars) + adoption (forks), from the live GitHub API. <a href="/#methodology">Methodology</a>. Footprint verified against official docs (<span class="est">est</span> = RAM not in docs, estimated). Machine-readable data: <a href="/api/tools.json">/api/tools.json</a>.</p>
<p class="muted">Data updated ${esc(updated.slice(0, 10))}. Not affiliated with the listed vendors.</p>
</footer>
</body></html>`;

// ---------- tool page ----------
function toolPage(tool: EnrichedTool, all: EnrichedTool[]): string {
  const url = `${SITE_URL}/alternatives/${tool.slug}/`;
  const title = `Self-Hostable Open-Source ${tool.name} Alternatives (2026)`;
  const desc = `${tool.alternatives.length} self-hostable open-source ${tool.name} alternatives, ranked by a live Self-Host Health Score with verified deploy footprint (RAM, database, Raspberry-Pi/ARM, one-click). Sort & filter to fit your hardware.`;

  const rows = tool.alternatives
    .map((a: EnrichedAlternative) => {
      const conf = a.footprintConfidence
        ? `<span class="conf c-${a.footprintConfidence}" title="footprint confidence: ${a.footprintConfidence}">●</span>`
        : "";
      const ram = a.footprint.minRamMB > 0 ? a.footprint.minRamMB : 999999;
      return `<tr data-name="${esc(a.name.toLowerCase())}" data-health="${a.healthScore}" data-stars="${a.gh.stars ?? 0}" data-ram="${ram}" data-arm="${a.footprint.arm64 ? 1 : 0}" data-oneclick="${a.footprint.oneClick.length ? 1 : 0}">
<td class="name" data-label="Tool"><a href="${esc(a.homepage ?? "https://github.com/" + a.github)}" rel="nofollow">${esc(a.name)}</a>
  <a class="gh" href="https://github.com/${esc(a.github)}" rel="nofollow" title="GitHub repo">↗</a>
  <div class="desc">${esc(a.description)}</div></td>
<td data-label="Health"><span class="badge ${healthClass(a.healthScore)}">${a.healthScore}</span><div class="muted sm">${healthLabel(a.healthScore)}</div></td>
<td data-label="Stars">${stars(a.gh.stars)}★<div class="muted sm">${esc(a.gh.language ?? "")}</div></td>
<td data-label="Database" title="${esc(a.footprint.database)}">${esc(dbShort(a.footprint.database))}</td>
<td data-label="Min RAM">${ramCell(a)}</td>
<td class="ctr" data-label="ARM/Pi">${a.footprint.arm64 ? '<span class="yes">✓</span>' : '<span class="no">✗</span>'} ${conf}</td>
<td data-label="One-click">${oneClickChips(a.footprint.oneClick)}</td>
<td class="muted sm" data-label="Updated">${rel(a.gh.pushedAt)}<div>${esc(lic(a.gh.license))}</div></td>
</tr>`;
    })
    .join("\n");

  const faq = [
    { q: `What is the best self-hostable ${tool.name} alternative?`, a: `By the live Self-Host Health Score, ${tool.alternatives[0]?.name} ranks highest (${tool.alternatives[0]?.healthScore}/100).` },
    { q: `Which open-source ${tool.name} alternatives run on a Raspberry Pi?`, a: `Those with official ARM64 images: ${tool.alternatives.filter((a) => a.footprint.arm64).map((a) => a.name).join(", ") || "none currently"}.` },
    {
      q: `Which is the lightest on RAM?`,
      a:
        tool.alternatives.filter((a) => a.footprint.minRamMB > 0).sort((a, b) => a.footprint.minRamMB - b.footprint.minRamMB).slice(0, 1).map((a) => `${a.name}, at about ${a.footprint.minRamMB} MB.`).join("") || "Varies by tool.",
    },
  ];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    url,
    numberOfItems: tool.alternatives.length,
    itemListElement: tool.alternatives.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "SoftwareApplication", name: a.name, applicationCategory: tool.category, operatingSystem: "Self-hosted, Linux", url: a.homepage ?? `https://github.com/${a.github}` },
    })),
  };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  const related = relatedTools(tool, all);

  return (
    head(title, desc, url, [itemList, faqLd]) +
    `<nav class="crumbs"><a href="/">Home</a> › ${esc(tool.name)} alternatives</nav>
<h1>Self-hostable open-source <span class="hl">${esc(tool.name)}</span> alternatives</h1>
<p class="lead">${esc(tool.blurb)}</p>
${quickAnswer(tool)}
<p class="synth">${synthesize(tool)}</p>
${ctaBox()}
<div class="filters">
<strong class="muted sm">Filter:</strong>
<label><input type="checkbox" data-filter="arm"> 🍓 Runs on Raspberry Pi</label>
<label><input type="checkbox" data-filter="oneclick"> ⚡ One-click deploy</label>
<label><input type="checkbox" data-filter="ram"> 🪶 RAM ≤ 1 GB</label>
<span class="muted sm"><span id="rowcount">${tool.alternatives.length}</span>/${tool.alternatives.length} shown · click a column header to sort</span>
</div>
<div class="tablewrap"><table data-sortable>
<thead><tr><th>Tool</th><th data-key="health" class="sortable">Health ▾</th><th data-key="stars" class="sortable">Stars</th><th>Database</th><th data-key="ram" class="sortable">Min RAM</th><th class="ctr">ARM/Pi</th><th>One-click</th><th>Updated</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>
${badgeSection(tool)}
<section class="related"><h2>Related</h2><div class="relgrid">${related.map((t) => `<a href="/alternatives/${t.slug}/">${esc(t.name)} alternatives</a>`).join("")}</div></section>
<section class="faq"><h2>FAQ</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>
` +
    foot(new Date(nowMs).toISOString())
  );
}

// ---------- "What can I run?" matcher ----------
function matcherPage(data: Enriched): string {
  const url = `${SITE_URL}/can-i-run/`;
  const title = `What can I self-host on my server? — ${SITE_NAME}`;
  const desc = `Pick your hardware (Raspberry Pi, small VPS, 4 GB…) and instantly see every self-hostable open-source app that fits, across all categories, ranked by health.`;
  const jsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: "What can I self-host?", url, applicationCategory: "DeveloperApplication", operatingSystem: "Web" };
  return (
    head(title, desc, url, jsonLd) +
    `<nav class="crumbs"><a href="/">Home</a> › What can I run?</nav>
<h1>What can I <span class="hl">self-host</span> on my server?</h1>
<p class="lead">Pick your hardware — see every open-source app that fits, across all ${data.tools.length} categories, ranked by Self-Host Health Score.</p>
<div id="matcher" class="matcher">
<label>RAM available
<select id="m-ram">
<option value="512">512 MB</option>
<option value="1024">1 GB</option>
<option value="2048" selected>2 GB</option>
<option value="4096">4 GB</option>
<option value="8192">8 GB +</option>
</select></label>
<label><input type="checkbox" id="m-arm"> 🍓 Raspberry Pi / ARM only</label>
<label><input type="checkbox" id="m-oc"> ⚡ one-click only</label>
<span class="muted"><b id="m-count">…</b> apps fit</span>
</div>
<div id="m-out" class="mlist"></div>
<noscript><p class="muted">This tool needs JavaScript. Browse the <a href="/">full directory</a> instead.</p></noscript>
` +
    foot(data.generatedAt)
  );
}

// ---------- cross-category collection ----------
type Collection = { slug: string; title: string; h1: string; desc: string; filter: (a: EnrichedAlternative) => boolean };
const COLLECTIONS: Collection[] = [
  { slug: "raspberry-pi", title: "Self-Hostable Apps That Run on a Raspberry Pi (2026)", h1: "Self-hostable apps for a <span class=\"hl\">Raspberry Pi</span>", desc: "Open-source apps with official ARM64 images and modest RAM — ideal for a Raspberry Pi or ARM SBC.", filter: (a) => a.footprint.arm64 && a.footprint.minRamMB > 0 && a.footprint.minRamMB <= 2048 },
  { slug: "lightweight", title: "Lightweight Self-Hostable Apps (≤512 MB RAM)", h1: "Lightweight self-hostable apps <span class=\"hl\">(≤512 MB)</span>", desc: "Open-source apps that run in 512 MB RAM or less — for tiny VPS instances and single-board computers.", filter: (a) => a.footprint.minRamMB > 0 && a.footprint.minRamMB <= 512 },
  { slug: "one-click", title: "Self-Hostable Apps With One-Click Deploy", h1: "Self-hostable apps with <span class=\"hl\">one-click deploy</span>", desc: "Open-source apps you can deploy in one click via Coolify, Railway, PikaPods, DigitalOcean and more.", filter: (a) => a.footprint.oneClick.length > 0 },
  { slug: "healthiest", title: "Healthiest Self-Hostable Open-Source Apps", h1: "The <span class=\"hl\">healthiest</span> self-hostable apps", desc: "The most actively maintained open-source apps by Self-Host Health Score (90+/100).", filter: (a) => a.healthScore >= 90 },
];

function collectionPage(c: Collection, data: Enriched): string {
  const url = `${SITE_URL}/collections/${c.slug}/`;
  const flat = flatten(data).filter((f) => f.a.gh.found && c.filter(f.a)).sort((x, y) => y.a.healthScore - x.a.healthScore);
  const rows = flat
    .map(
      (f) => `<tr>
<td class="name" data-label="App"><a href="/alternatives/${f.toolSlug}/" >${esc(f.a.name)}</a><div class="desc">${esc(f.a.description)} <span class="muted">· ${esc(f.tool)} alternative</span></div></td>
<td data-label="Health"><span class="badge ${healthClass(f.a.healthScore)}">${f.a.healthScore}</span></td>
<td data-label="Stars">${stars(f.a.gh.stars)}★</td>
<td data-label="Min RAM">${ramCell(f.a)}</td>
<td class="ctr" data-label="ARM/Pi">${f.a.footprint.arm64 ? '<span class="yes">✓</span>' : '<span class="no">✗</span>'}</td>
<td data-label="One-click">${oneClickChips(f.a.footprint.oneClick)}</td>
</tr>`,
    )
    .join("\n");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: c.title,
    url,
    numberOfItems: flat.length,
    itemListElement: flat.map((f, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "SoftwareApplication", name: f.a.name, operatingSystem: "Self-hosted, Linux", url: f.a.homepage ?? `https://github.com/${f.a.github}` } })),
  };
  const others = COLLECTIONS.filter((x) => x.slug !== c.slug);
  return (
    head(c.title, c.desc, url, jsonLd) +
    `<nav class="crumbs"><a href="/">Home</a> › Collections › ${esc(c.title)}</nav>
<h1>${c.h1}</h1>
<p class="lead">${esc(c.desc)}</p>
<p class="synth"><strong>${flat.length}</strong> apps qualify, ranked by Self-Host Health Score.</p>
<div class="tablewrap"><table>
<thead><tr><th>App</th><th>Health</th><th>Stars</th><th>Min RAM</th><th class="ctr">ARM/Pi</th><th>One-click</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>
<section class="related"><h2>More collections</h2><div class="relgrid">${others.map((x) => `<a href="/collections/${x.slug}/">${esc(x.h1.replace(/<[^>]+>/g, ""))}</a>`).join("")}<a href="/can-i-run/">What can I run? →</a></div></section>
` +
    foot(data.generatedAt)
  );
}

// ---------- sponsor / get-listed (the money door) ----------
function sponsorPage(data: Enriched): string {
  const url = `${SITE_URL}/sponsor/`;
  const title = `Sponsor / Get Listed — ${SITE_NAME}`;
  const desc = `Get your open-source tool featured on SelfHostScore, in front of developers and self-hosters actively choosing what to deploy.`;
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const jsonLd = { "@context": "https://schema.org", "@type": "WebPage", name: title, url, description: desc };
  const mail = (sub: string) => `mailto:team@selfhostscore.com?subject=${encodeURIComponent(sub)}`;
  return (
    head(title, desc, url, jsonLd) +
    `<nav class="crumbs"><a href="/">Home</a> › Sponsor</nav>
<h1>Get your tool in front of people <span class="hl">choosing what to deploy</span></h1>
<p class="lead">SelfHostScore is read by developers and self-hosters comparing ${altCount} open-source apps across ${data.tools.length} categories — high purchase/deploy intent, exactly when they pick what to run. New but growing fast.</p>
<div class="grid">
<div class="card price">
<div class="cat">Founding sponsor · first 10 only</div>
<h3>Featured listing</h3>
<p class="big">$49<span class="muted sm">/mo</span></p>
<ul>
<li>Your tool <strong>pinned to the top</strong> of its category page</li>
<li><strong>"Verified" badge</strong> + a do-follow link to your site</li>
<li>Rotating slot on the <strong>homepage</strong> + the matcher</li>
<li>You appear in the <code>/api/tools.json</code> feed AI engines cite</li>
</ul>
<a class="bigcta" href="${mail("Founding featured listing")}">Email to claim a spot →</a>
<p class="muted sm">Price <strong>locked for life</strong>. Normally $149/mo. Cancel anytime.</p>
</div>
<div class="card price">
<div class="cat">Free · for any listed project</div>
<h3>"Listed on SelfHostScore" badge</h3>
<p class="big">Free</p>
<ul>
<li>Show off your <strong>Health Score</strong> / <strong>#1 ranking</strong> on your own site</li>
<li>Live SVG badge (refreshed daily) + a <a href="https://shields.io/badges/endpoint-badge" rel="nofollow">Shields.io endpoint</a></li>
<li>Great for "open-source alternative to X" landing pages</li>
<li>Builds the open-source self-host community</li>
</ul>
<a class="bigcta" href="/">Open your category page → "Add the badge" → paste</a>
<p class="muted sm">Maintainers love these — and they link back. 🙂</p>
</div>
</div>
<section class="meth"><h2>Why it converts</h2>
<p>Unlike a generic listicle, every visitor here is mid-decision: they're literally on the page comparing self-hostable alternatives by RAM, ARM/Raspberry-Pi support, one-click deploy and project health. A featured slot reaches them at the exact moment they choose what to run — and the link is a clean, relevant, do-follow signal. Honest note: we're early (launched 2026), so founding pricing reflects that — you lock a low rate now and ride the growth.</p>
<p>Questions or a custom deal (newsletter, category takeover)? <a href="${mail("Sponsorship question")}">team@selfhostscore.com</a>.</p></section>
` +
    foot(data.generatedAt)
  );
}

// ---------- homepage ----------
function homePage(data: Enriched): string {
  const url = `${SITE_URL}/`;
  const title = `${SITE_NAME} — Self-Hostable Open-Source Alternatives, Verified`;
  const desc = `Self-hostable open-source alternatives to popular SaaS, ranked by a live GitHub Self-Host Health Score with verified deploy footprint (RAM, database, Raspberry-Pi support, one-click deploy).`;
  const cards = data.tools
    .map((t) => {
      const top = t.alternatives[0];
      return `<a class="card" href="/alternatives/${t.slug}/" data-name="${esc((t.name + " " + t.category).toLowerCase())}">
<div class="cat">${esc(t.category)}</div>
<h3>${esc(t.name)} alternatives</h3>
<div class="muted sm">${t.alternatives.length} options · top: ${esc(top?.name ?? "")} (${top?.healthScore ?? "—"})</div>
</a>`;
    })
    .join("\n");
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const collectionPage = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url, description: desc };
  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "SelfHostScore — self-hostable open-source alternatives with health score & deploy footprint",
    description: `${altCount} self-hostable open-source alternatives across ${data.tools.length} SaaS categories, each with a GitHub-derived health score and verified deploy footprint (RAM, database, ARM/Raspberry-Pi, one-click).`,
    url,
    creator: { "@type": "Organization", name: SITE_NAME },
    distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}/api/tools.json` },
    isAccessibleForFree: true,
    dateModified: data.generatedAt.slice(0, 10),
  };
  return (
    head(title, desc, url, [collectionPage, dataset]) +
    `<h1>Self-hostable, open-source alternatives — <span class="hl">verified</span></h1>
<p class="lead">One page per tool. Ranked by a live <strong>Self-Host Health Score</strong> from the GitHub API, with a <strong>deploy footprint</strong> we verify against official docs — RAM, database, Raspberry-Pi/ARM support and one-click deploy. The data incumbents don't compute.</p>
<a class="bigcta" href="/can-i-run/">🖥️ <strong>What can I self-host on my server?</strong> — pick your hardware, see what fits →</a>
<input id="search" type="search" placeholder="Search ${data.tools.length} tools…  (e.g. notion, backup, crm, photos)" autocomplete="off" aria-label="Search tools">
<div class="grid">${cards}</div>
<section id="collections" class="meth"><h2>Collections</h2><div class="relgrid">${COLLECTIONS.map((c) => `<a href="/collections/${c.slug}/">${esc(c.h1.replace(/<[^>]+>/g, ""))}</a>`).join("")}</div></section>
<section id="methodology" class="meth"><h2>How the Self-Host Health Score works</h2>
<p>A transparent 0–100 composite from a single GitHub fetch: <strong>activity</strong> (commit recency, 35), <strong>releases</strong> (latest-release recency, 25), <strong>maturity</strong> (stars, log-scaled, 25), <strong>adoption</strong> (forks, log-scaled, 15). Archived or unmaintained repos score 0, refreshed from the live GitHub API. The <strong>deploy footprint</strong> (database, min RAM, ARM/Pi, one-click) is verified against each project's official docs; <span class="est">est</span> marks a RAM figure not stated in the docs. Full machine-readable data: <a href="/api/tools.json">/api/tools.json</a>.</p></section>
` +
    foot(data.generatedAt)
  );
}

// ---------- machine-readable feed (AEO + matcher) ----------
function jsonFeed(data: Enriched): string {
  return JSON.stringify(
    {
      site: SITE_NAME,
      url: SITE_URL,
      updated: data.generatedAt,
      license: "CC BY 4.0 — free to use with attribution to SelfHostScore (https://selfhostscore.com).",
      tools: data.tools.map((t) => ({
        name: t.name,
        slug: t.slug,
        category: t.category,
        page: `${SITE_URL}/alternatives/${t.slug}/`,
        alternatives: t.alternatives.map((a) => ({
          name: a.name,
          github: a.github,
          homepage: a.homepage ?? null,
          description: a.description,
          healthScore: a.healthScore,
          stars: a.gh.stars ?? null,
          language: a.gh.language ?? null,
          license: lic(a.gh.license) || null,
          lastCommit: a.gh.pushedAt ?? null,
          database: a.footprint.database,
          minRamMB: a.footprint.minRamMB || null,
          arm64: a.footprint.arm64,
          oneClick: a.footprint.oneClick,
          deploy: a.footprint.deploy,
          footprintConfidence: a.footprintConfidence ?? null,
        })),
      })),
    },
    null,
    2,
  );
}

function llmsTxt(data: Enriched): string {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> Directory of self-hostable open-source alternatives to popular SaaS. Each alternative has a live GitHub "Self-Host Health Score" (0-100) and a deploy footprint verified against official docs: minimum RAM, database, ARM64/Raspberry-Pi support, and one-click deploy availability.`,
    "",
    `Machine-readable data (full dataset): ${SITE_URL}/api/tools.json`,
    `Updated: ${data.generatedAt.slice(0, 10)}. ${data.tools.length} tools, ${data.tools.reduce((n, t) => n + t.alternatives.length, 0)} alternatives. Free to cite with attribution.`,
    "",
    "## Tool pages",
    ...data.tools.map((t) => `- [${t.name} alternatives](${SITE_URL}/alternatives/${t.slug}/): self-hostable open-source ${t.name} alternatives, ranked.`),
    "",
    "## Collections",
    ...COLLECTIONS.map((c) => `- [${c.h1.replace(/<[^>]+>/g, "")}](${SITE_URL}/collections/${c.slug}/)`),
    `- [What can I self-host on my hardware?](${SITE_URL}/can-i-run/)`,
    "",
  ];
  return lines.join("\n");
}

// GitHub-ready markdown export (LLM ingestion + backlinks)
function awesomeMd(data: Enriched): string {
  const out = [
    `# SelfHostScore — Self-Hostable Open-Source Alternatives`,
    "",
    `Open-source, self-hostable alternatives to popular SaaS, each with a **Self-Host Health Score** (live GitHub activity/releases/stars/forks) and a **deploy footprint** verified against official docs (min RAM, database, ARM/Raspberry-Pi, one-click).`,
    "",
    `🔗 Live + interactive: ${SITE_URL} · 📊 Data: ${SITE_URL}/api/tools.json · Updated ${data.generatedAt.slice(0, 10)}`,
    "",
  ];
  for (const t of data.tools) {
    out.push(`## ${t.name} alternatives`, "", `| Alternative | Health | Stars | DB | Min RAM | ARM/Pi | One-click |`, `|---|---|---|---|---|---|---|`);
    for (const a of t.alternatives) {
      out.push(
        `| [${a.name}](https://github.com/${a.github}) | ${a.healthScore} | ${stars(a.gh.stars)} | ${dbShort(a.footprint.database)} | ${a.footprint.minRamMB || "?"}${a.footprint.minRamMB ? " MB" : ""} | ${a.footprint.arm64 ? "✅" : "❌"} | ${a.footprint.oneClick.length ? "✅" : "—"} |`,
      );
    }
    out.push(`\n→ Full details: ${SITE_URL}/alternatives/${t.slug}/\n`);
  }
  return out.join("\n");
}

// ---------- client JS ----------
const APP_JS = `(function(){
  function hc(s){return s>=80?'h-thriving':s>=60?'h-healthy':s>=40?'h-steady':s>=20?'h-risk':'h-dormant';}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];});}
  var table=document.querySelector('table[data-sortable]');
  if(table){
    var tbody=table.querySelector('tbody');
    var rows=function(){return Array.prototype.slice.call(tbody.querySelectorAll('tr'));};
    table.querySelectorAll('th[data-key]').forEach(function(th){
      th.addEventListener('click',function(){
        var key=th.getAttribute('data-key'), asc=th.getAttribute('data-asc')!=='1';
        table.querySelectorAll('th[data-key]').forEach(function(h){h.removeAttribute('data-asc');h.classList.remove('asc','desc');});
        th.setAttribute('data-asc',asc?'1':'0'); th.classList.add(asc?'asc':'desc');
        rows().sort(function(a,b){var av=+a.getAttribute('data-'+key),bv=+b.getAttribute('data-'+key);return asc?av-bv:bv-av;}).forEach(function(r){tbody.appendChild(r);});
      });
    });
    var cnt=document.getElementById('rowcount');
    function apply(){
      var arm=document.querySelector('[data-filter=arm]'),oc=document.querySelector('[data-filter=oneclick]'),ram=document.querySelector('[data-filter=ram]');
      var shown=0;
      rows().forEach(function(r){
        var ok=true;
        if(arm&&arm.checked&&r.getAttribute('data-arm')!=='1')ok=false;
        if(oc&&oc.checked&&r.getAttribute('data-oneclick')!=='1')ok=false;
        if(ram&&ram.checked&&+r.getAttribute('data-ram')>1024)ok=false;
        r.style.display=ok?'':'none'; if(ok)shown++;
      });
      if(cnt)cnt.textContent=shown;
    }
    document.querySelectorAll('[data-filter]').forEach(function(f){f.addEventListener('change',apply);});
  }
  var search=document.getElementById('search');
  if(search){
    var cards=Array.prototype.slice.call(document.querySelectorAll('.card'));
    search.addEventListener('input',function(){
      var q=search.value.toLowerCase().trim();
      cards.forEach(function(c){c.style.display=c.getAttribute('data-name').indexOf(q)>-1?'':'none';});
    });
  }
  var matcher=document.getElementById('matcher');
  if(matcher){
    var ramSel=document.getElementById('m-ram'),armChk=document.getElementById('m-arm'),ocChk=document.getElementById('m-oc'),out=document.getElementById('m-out'),mc=document.getElementById('m-count');
    fetch('/api/tools.json').then(function(r){return r.json();}).then(function(data){
      var alts=[];
      data.tools.forEach(function(t){t.alternatives.forEach(function(a){alts.push({tool:t.name,slug:t.slug,name:a.name,health:a.healthScore,ram:a.minRamMB,arm:a.arm64,oc:(a.oneClick||[]).length>0,db:a.database});});});
      function render(){
        var maxRam=+ramSel.value,arm=armChk.checked,oc=ocChk.checked;
        var fit=alts.filter(function(a){var r=a.ram&&a.ram>0?a.ram:999999;if(r>maxRam)return false;if(arm&&!a.arm)return false;if(oc&&!a.oc)return false;return true;}).sort(function(x,y){return y.health-x.health;});
        mc.textContent=fit.length;
        out.innerHTML=fit.map(function(a){return '<a class="mrow" href="/alternatives/'+a.slug+'/"><span class="badge '+hc(a.health)+'">'+a.health+'</span> <b>'+esc(a.name)+'</b> <span class="muted">'+esc(a.tool)+' alt · '+(a.ram>0?a.ram+'MB':'RAM n/a')+(a.arm?' · ARM':'')+(a.oc?' · 1-click':'')+'</span></a>';}).join('') || '<p class="muted">Nothing fits — try more RAM or uncheck a filter.</p>';
      }
      ramSel.addEventListener('change',render);armChk.addEventListener('change',render);ocChk.addEventListener('change',render);render();
    }).catch(function(){out.innerHTML='<p class="muted">Could not load data.</p>';});
  }
})();`;

// ---------- css ----------
const CSS = `:root{--bg:#0f1115;--panel:#171a21;--ink:#e8eaed;--muted:#9aa3b2;--line:#262b36;--acc:#3ddc97;--acc2:#7aa2ff}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink)}
a{color:var(--acc2);text-decoration:none}a:hover{text-decoration:underline}
header.site{display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:16px 24px;border-bottom:1px solid var(--line);background:var(--panel)}
.brand{font-weight:700;font-size:18px;color:var(--ink)}
.nav{display:flex;gap:16px}.nav a{font-size:14px;color:#c7ccd6}
.tag{color:var(--muted);font-size:13px;margin-left:auto}
main{max-width:1080px;margin:0 auto;padding:32px 24px 8px}
h1{font-size:30px;line-height:1.2;margin:.2em 0 .3em;letter-spacing:-.01em}
.hl{color:var(--acc)}
.lead{color:#c7ccd6;font-size:18px;max-width:72ch}
.bigcta{display:block;background:linear-gradient(90deg,#13261d,#13202b);border:1px solid #1f4736;border-radius:12px;padding:16px 18px;margin:18px 0 6px;font-size:17px;color:var(--ink)}
.bigcta:hover{border-color:var(--acc);text-decoration:none}.bigcta strong{color:var(--acc)}
.quick{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 18px;margin:14px 0;max-width:80ch}
.quick .qh{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--acc);font-weight:700;margin:8px 0 0}
.quick ul{margin:6px 0 10px;padding-left:18px}.quick li{margin:3px 0;color:#c7ccd6}
.synth{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--acc);padding:14px 16px;border-radius:8px;max-width:80ch}
.cta{background:#13261d;border:1px solid #1f4736;border-radius:8px;padding:12px 16px;margin:14px 0;font-size:14.5px;max-width:80ch}.cta a{color:var(--acc)}
.crumbs{color:var(--muted);font-size:13px;margin-bottom:8px}
#search{width:100%;max-width:460px;padding:11px 14px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-size:15px;margin:4px 0 6px}
#search:focus,#m-ram:focus{outline:none;border-color:var(--acc)}
.filters,.matcher{display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:16px 0 0}
.matcher{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px;font-size:15px}
.matcher label{display:inline-flex;gap:7px;align-items:center}
.matcher select{background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:7px;padding:6px 10px;font-size:15px}
.filters label{font-size:13px;color:#c7ccd6;cursor:pointer;user-select:none;display:inline-flex;gap:6px;align-items:center;background:var(--panel);border:1px solid var(--line);padding:5px 10px;border-radius:7px}
.filters label:hover{border-color:var(--acc)}
.filters input,.matcher input{accent-color:var(--acc)}
.mlist{margin:16px 0;display:flex;flex-direction:column;gap:6px}
.mrow{display:flex;gap:10px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:9px 12px;color:var(--ink)}
.mrow:hover{border-color:var(--acc);text-decoration:none}.mrow .muted{font-size:13px}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;margin:12px 0 0}
table{border-collapse:collapse;width:100%;font-size:14px;min-width:760px}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#11141a;color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;position:sticky;top:0}
th.sortable{cursor:pointer}th.sortable:hover{color:var(--ink)}th.asc::after{content:" ▴"}th.desc::after{content:" ▾"}
tr:last-child td{border-bottom:0}
td.name a{font-weight:600;color:var(--ink)}td.name .gh{color:var(--muted);font-weight:400}
td.ctr{text-align:center}
.desc{color:var(--muted);font-size:12.5px;margin-top:3px;max-width:46ch}
.muted{color:var(--muted)}.sm{font-size:12px}
.est{font-size:10px;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 4px;vertical-align:middle}
.badge{display:inline-block;min-width:30px;text-align:center;padding:3px 8px;border-radius:6px;font-weight:700;color:#0b0d10}
.h-thriving{background:#3ddc97}.h-healthy{background:#76d0a3}.h-steady{background:#e8c468}.h-risk{background:#e89c5a}.h-dormant{background:#d9676a}
.chip{display:inline-block;padding:2px 7px;border-radius:5px;font-size:11.5px;border:1px solid var(--line);background:#11141a;color:#c7ccd6;margin:1px 0}
.yes{color:var(--acc);font-weight:700}.no{color:#d9676a}
.conf{font-size:10px;vertical-align:middle}.c-high{color:var(--acc)}.c-medium{color:#e8c468}.c-low{color:#d9676a}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin:16px 0 22px}
.card{display:block;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;transition:border-color .15s}
.card:hover{border-color:var(--acc);text-decoration:none}
.card h3{margin:.3em 0;font-size:17px;color:var(--ink)}
.price{display:flex;flex-direction:column}.price .big{font-size:34px;font-weight:800;margin:4px 0}
.price ul{padding-left:18px;color:#c7ccd6;font-size:14px;flex:1;margin:8px 0}.price li{margin:4px 0}
.price .bigcta{margin:8px 0 4px;text-align:center;font-size:15px;padding:11px 14px}
.cat{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--acc2)}
.related,.meth{margin:30px 0}.related h2,.meth h2{font-size:18px}
.relgrid{display:flex;flex-wrap:wrap;gap:8px}.relgrid a{background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:7px 11px;font-size:13.5px}
.relgrid a:hover{border-color:var(--acc);text-decoration:none}
.faq{margin:30px 0}.faq summary{cursor:pointer;font-weight:600;padding:10px 0;border-bottom:1px solid var(--line)}
.faq p{color:#c7ccd6}
.meth{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px}
footer{max-width:1080px;margin:30px auto 0;padding:24px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}
@media(max-width:720px){
  main{padding:22px 16px}h1{font-size:24px}.tag{display:none}
  .tablewrap{border:0;overflow:visible}table{min-width:0}thead{display:none}
  table,tbody,tr,td{display:block;width:100%}
  tr{border:1px solid var(--line);border-radius:9px;margin:0 0 10px;padding:6px 0;background:var(--panel)}
  tr:last-child td{border-bottom:1px solid var(--line)}
  td{border:0;padding:6px 14px;display:flex;justify-content:space-between;gap:14px;align-items:baseline}
  td::before{content:attr(data-label);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.04em;flex:0 0 auto}
  td.name{display:block}td.name::before{display:none}.desc{max-width:none}
}`;

function ogCard(toolCount: number, altCount: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,sans-serif}
  body{width:1200px;height:630px;background:#0f1115;color:#e8eaed;padding:70px;display:flex;flex-direction:column;justify-content:center}
  .b{font-size:30px;color:#3ddc97;font-weight:700;letter-spacing:.5px}
  h1{font-size:74px;line-height:1.05;margin:18px 0 14px;letter-spacing:-1px}h1 .g{color:#3ddc97}
  p{font-size:30px;color:#c7ccd6;max-width:980px;line-height:1.4}
  .row{display:flex;gap:14px;margin-top:40px}
  .pill{background:#171a21;border:1px solid #262b36;border-radius:10px;padding:14px 20px;font-size:24px;color:#c7ccd6}.pill b{color:#e8eaed}
  </style></head><body>
  <div class="b">✓ SelfHostScore</div>
  <h1>Self-hostable, open-source<br>alternatives — <span class="g">verified</span></h1>
  <p>Ranked by a live GitHub Health Score, with deploy footprint we verify against official docs.</p>
  <div class="row"><div class="pill"><b>${toolCount}</b> tools</div><div class="pill"><b>${altCount}</b> alternatives</div><div class="pill">RAM · 🍓 ARM · ⚡ one-click</div></div>
  </body></html>`;
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f1115"/><path d="M17 33l10 11 20-24" fill="none" stroke="#3ddc97" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------- build ----------
async function main(): Promise<void> {
  const data = JSON.parse(await readFile(DATA, "utf8")) as Enriched;
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await mkdir(join(OUT, "api"), { recursive: true });

  await writeFile(join(OUT, "styles.css"), CSS, "utf8");
  await writeFile(join(OUT, "app.js"), APP_JS, "utf8");
  await writeFile(join(OUT, "favicon.svg"), FAVICON, "utf8");
  await writeFile(join(OUT, "og-card.html"), ogCard(data.tools.length, altCount), "utf8");
  await writeFile(join(OUT, "index.html"), homePage(data), "utf8");
  await writeFile(join(OUT, "api", "tools.json"), jsonFeed(data), "utf8");
  await writeFile(join(OUT, "llms.txt"), llmsTxt(data), "utf8");
  const awesome = awesomeMd(data);
  await writeFile(join(ROOT, "awesome.md"), awesome, "utf8"); // GitHub-repo export (in project root)
  await writeFile(join(ROOT, "data", "tools.json"), jsonFeed(data), "utf8"); // committed public dataset
  // README.md = docs/README-header.md + the awesome list body (from its first "## " heading on)
  const header = await readFile(join(ROOT, "docs", "README-header.md"), "utf8").catch(() => "");
  if (header) {
    const body = awesome.slice(Math.max(0, awesome.indexOf("\n## ")));
    await writeFile(join(ROOT, "README.md"), `${header.trimEnd()}

_Data updated ${data.generatedAt.slice(0, 10)}. Tables below are generated — edit [data/seed.json](data/seed.json), not this file._
${body.trimEnd()}
`, "utf8");
  }

  // Embeddable badges: /api/badge/<slug>.svg + .json (Shields endpoint schema)
  await mkdir(join(OUT, "api", "badge"), { recursive: true });
  const seenBadge = new Set<string>();
  for (const f of flatten(data)) {
    if (seenBadge.has(f.a.slug)) continue;
    seenBadge.add(f.a.slug);
    await writeFile(join(OUT, "api", "badge", `${f.a.slug}.svg`), badgeSvg(f.a), "utf8");
    await writeFile(join(OUT, "api", "badge", `${f.a.slug}.json`), badgeJson(f.a), "utf8");
  }

  const urls: string[] = [`${SITE_URL}/`, `${SITE_URL}/can-i-run/`];

  await mkdir(join(OUT, "can-i-run"), { recursive: true });
  await writeFile(join(OUT, "can-i-run", "index.html"), matcherPage(data), "utf8");

  await mkdir(join(OUT, "sponsor"), { recursive: true });
  await writeFile(join(OUT, "sponsor", "index.html"), sponsorPage(data), "utf8");
  urls.push(`${SITE_URL}/sponsor/`);

  for (const c of COLLECTIONS) {
    const dir = join(OUT, "collections", c.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), collectionPage(c, data), "utf8");
    urls.push(`${SITE_URL}/collections/${c.slug}/`);
  }

  for (const tool of data.tools) {
    const dir = join(OUT, "alternatives", tool.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), toolPage(tool, data.tools), "utf8");
    urls.push(`${SITE_URL}/alternatives/${tool.slug}/`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `<url><loc>${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  await writeFile(join(OUT, "sitemap.xml"), sitemap, "utf8");
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, "utf8");

  await cp(join(ROOT, "public"), OUT, { recursive: true }).catch(() => {});

  console.log(`Built ${data.tools.length} tool pages + homepage + matcher + ${COLLECTIONS.length} collections → ${OUT}`);
  console.log(`Pages: ${urls.length}. Wrote api/tools.json, ${seenBadge.size} badges (api/badge/*), llms.txt, awesome.md, README.md, data/tools.json, app.js, favicon, og-card, sitemap, robots.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
