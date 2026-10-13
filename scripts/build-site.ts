// Zero-dependency static site generator. Reads data/enriched.json and writes dist/.
// Run: node scripts/build-site.ts   (SITE_URL defaults to https://selfhostscore.com)
//
// Output: index.html, alternatives/<tool>/, can-i-run/, collections/<slug>/, methodology/, api/, about/,
//   sponsor/, api/tools.json (machine-readable feed), api/badge/<slug>.svg|.json, llms.txt,
//   styles.css, app.js, favicon.svg, og.png (from public/), robots.txt, sitemap.xml.
// Also writes awesome.md, README.md (from docs/README-header.md) and data/tools.json in the project root.
//
// Writing rules for everything user-facing: no emoji or pictographs, no em or en dashes,
// no exclamation marks, plain technical English. Booleans render as SVG marks with text for screen readers.

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
const REPO_URL = "https://github.com/selfhostscore/self-hosted-alternatives";
const CONTACT = "team@selfhostscore.com";
const YEAR = new Date().getUTCFullYear();

// ---------- helpers ----------
const esc = (s: string): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const nowMs = Date.now();

function rel(iso: string | null | undefined): string {
  if (!iso) return "n/a";
  const d = Math.floor((nowMs - Date.parse(iso)) / 86_400_000);
  if (Number.isNaN(d)) return "n/a";
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

const stars = (n: number | undefined): string =>
  n == null ? "n/a" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const NO_DB = /^(none|no |no-|no external|no traditional|file-based|embedded)/i;
const isNoDb = (db: string): boolean => NO_DB.test(db) || /no external db|content-addressable/i.test(db);
const dbShort = (db: string): string => {
  if (isNoDb(db)) return "none / embedded";
  let s = db.split(" (")[0].split(/[.;\n]/)[0].trim();
  if (s.length > 26) s = s.slice(0, 24).trim() + "...";
  return s;
};
const dbProse = (db: string): string => (isNoDb(db) ? "no external database" : dbShort(db));
const lic = (x: string | null | undefined): string => (!x || x === "NOASSERTION" ? "" : x);
const isEst = (a: EnrichedAlternative): boolean => !!a.footprintConfidence && a.footprintConfidence !== "high";

function ramCell(a: EnrichedAlternative): string {
  const mb = a.footprint.minRamMB;
  if (!mb || mb <= 0) return '<span class="muted">n/a</span>';
  return isEst(a)
    ? `<span class="num">${mb} MB</span> <span class="est" title="Estimate: the official docs do not state a minimum">est</span>`
    : `<span class="num">${mb} MB</span>`;
}
const ramText = (a: EnrichedAlternative): string => (a.footprint.minRamMB > 0 ? `${isEst(a) ? "about " : ""}${a.footprint.minRamMB} MB` : "n/a");

// Boolean marks: inline SVG plus visually hidden text (copies and reads as Yes / No).
const MARK_YES = `<svg class="mark" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const MARK_NO = `<svg class="mark" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
const yesNo = (b: boolean): string =>
  b ? `<span class="bool yes">${MARK_YES}<span class="sr">Yes</span></span>` : `<span class="bool no">${MARK_NO}<span class="sr">No</span></span>`;

const ICON_GH = `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="currentColor" d="M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.7-3.6 3.9.3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 .2z"/></svg>`;
const BRAND_MARK = `<svg class="bm" viewBox="0 0 64 64" width="22" height="22" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0f1115"/><path d="M17 33l10 11 20-24" fill="none" stroke="#3ddc97" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------- embeddable Self-Host Score badge ----------
const BADGE_LABEL = "self-host score";
function badgeColor(s: number): { hex: string; name: string } {
  if (s >= 80) return { hex: "#4c1", name: "brightgreen" };
  if (s >= 60) return { hex: "#97ca00", name: "green" };
  if (s >= 40) return { hex: "#dfb317", name: "yellow" };
  if (s >= 20) return { hex: "#fe7d37", name: "orange" };
  return { hex: "#e05d44", name: "red" };
}
const badgeMessage = (a: EnrichedAlternative): string => `${a.healthScore} / 100 ${healthLabel(a.healthScore)}`;
/** Shields.io endpoint schema: https://img.shields.io/endpoint?url=<this file> */
const badgeJson = (a: EnrichedAlternative): string =>
  JSON.stringify({ schemaVersion: 1, label: BADGE_LABEL, message: badgeMessage(a), color: badgeColor(a.healthScore).name, cacheSeconds: 86400 });
/** Self-contained flat SVG badge (no third-party dependency). */
function badgeSvg(a: EnrichedAlternative): string {
  const label = BADGE_LABEL, msg = badgeMessage(a), color = badgeColor(a.healthScore).hex;
  const w = (t: string): number => Math.round(t.length * 6.4 + 12);
  const lw = w(label), mw = w(msg), tw = lw + mw;
  const t = (x: number, txt: string): string =>
    `<text x="${x}" y="15" fill="#010101" fill-opacity=".3">${esc(txt)}</text><text x="${x}" y="14">${esc(txt)}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="20" role="img" aria-label="${esc(label)}: ${esc(msg)}"><title>${esc(label)}: ${esc(msg)}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${tw}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${mw}" height="20" fill="${color}"/><rect width="${tw}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">${t(lw / 2, label)}${t(lw + mw / 2, msg)}</g></svg>`;
}
const badgeMarkdown = (a: EnrichedAlternative, toolSlug: string): string =>
  `[![Self-Host Score](${SITE_URL}/api/badge/${a.slug}.svg)](${SITE_URL}/alternatives/${toolSlug}/#${a.slug})`;

function badgeSection(tool: EnrichedTool): string {
  const rows = tool.alternatives
    .map(
      (a) =>
        `<div class="snip"><img src="/api/badge/${esc(a.slug)}.svg" alt="${esc(a.name)} Self-Host Score badge" height="20" loading="lazy"><strong>${esc(a.name)}</strong><code>${esc(badgeMarkdown(a, tool.slug))}</code></div>`,
    )
    .join("");
  return `<details class="embed" id="badge"><summary>Maintain one of these projects? Add the live Self-Host Score badge to your README</summary>
<p class="muted sm">Free, no sign-up, refreshed daily from the GitHub API. Click a snippet to select it and paste it into your README. For Shields.io, use <code>https://img.shields.io/endpoint?url=${SITE_URL}/api/badge/&lt;slug&gt;.json</code>. Details on the <a href="/api/#badges">API page</a>.</p>
${rows}</details>`;
}

function sourcesSection(tool: EnrichedTool): string {
  const items = tool.alternatives
    .map((a) => {
      const conf = a.footprintConfidence ?? "";
      const srcs = (a.footprintSources ?? []).map((u) => {
        let host = u;
        try {
          host = new URL(u).hostname.replace(/^www\./, "");
        } catch {
          /* keep raw */
        }
        return `<a href="${esc(u)}" rel="nofollow noopener" target="_blank">${esc(host)}</a>`;
      });
      return `<li id="src-${esc(a.slug)}"><strong>${esc(a.name)}</strong>${conf ? ` <span class="conf c-${esc(conf)}">confidence ${esc(conf)}</span>` : ""}: deploy via ${esc(a.footprint.deploy.join(", ") || "n/a")}. ${srcs.length ? `Sources: ${srcs.join(", ")}.` : "No source recorded."}</li>`;
    })
    .join("");
  return `<details class="sources"><summary>Footprint sources and confidence for each alternative</summary>
<p class="muted sm">Minimum RAM, database, ARM64 and one-click values come from each project's official documentation. Confidence levels are explained on the <a href="/methodology/#footprint">methodology page</a>.</p>
<ul>${items}</ul></details>`;
}

// ---- offers (managed hosting partners; links are marked rel=sponsored) ----
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
            ? `<a class="chip" href="${esc(u)}" rel="sponsored nofollow" title="${esc(x)}">${esc(short)}</a>`
            : `<span class="chip" title="${esc(x)}">${esc(short)}</span>`;
        })
        .join(" ")
    : '<span class="muted">none</span>';

const ctaBox = (): string => {
  if (!MANAGED.length) return "";
  const links = MANAGED.slice(0, 4)
    .map((p) => `<a href="${esc(p.url)}" rel="sponsored nofollow">${esc(p.name)}</a>`)
    .join(", ");
  return `<aside class="cta"><strong>No server to run it on?</strong> Managed open-source hosting deploys apps like these in one click: ${links}. <span class="muted sm">Sponsored links.</span></aside>`;
};

// flatten alternatives with their tool context (matcher feed, collections, badges)
type FlatAlt = { cat: string; tool: string; toolSlug: string; a: EnrichedAlternative };
const flatten = (data: Enriched): FlatAlt[] =>
  data.tools.flatMap((t) => t.alternatives.map((a) => ({ cat: t.category, tool: t.name, toolSlug: t.slug, a })));

// ---------- data-grounded synthesis and quotable quick answer ----------
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
    `This page tracks <strong>${alts.length}</strong> self-hostable open-source ${esc(tool.name)} alternatives. <strong>${esc(top.name)}</strong> currently has the highest Self-Host Health Score (${top.healthScore} of 100, ${stars(top.gh.stars)} stars, last commit ${rel(top.gh.pushedAt)}).`,
  );
  if (lightest)
    parts.push(`For a Raspberry Pi or a small VPS, <strong>${esc(lightest.name)}</strong> needs the least memory: ${ramText(lightest)} with ${esc(dbProse(lightest.footprint.database))}.`);
  if (pi.length) parts.push(`${pi.length} of them publish official ARM64 images (Raspberry Pi, Apple Silicon).`);
  if (oneClick.length)
    parts.push(
      `${oneClick.length} offer a one-click deploy, for example on ${esc([...new Set(oneClick.flatMap((a) => a.footprint.oneClick.map((x) => x.split(" (")[0])))].slice(0, 4).join(", "))}.`,
    );
  return parts.join(" ");
}

function quickAnswer(tool: EnrichedTool): string {
  const alts = tool.alternatives.filter((a) => a.gh.found);
  if (!alts.length) return "";
  const top = alts[0];
  const withRam = alts.filter((a) => a.footprint.minRamMB > 0).sort((a, b) => a.footprint.minRamMB - b.footprint.minRamMB);
  const lightest = withRam[0];
  const pi = alts.filter((a) => a.footprint.arm64).map((a) => a.name);
  const items: string[] = [];
  items.push(`<li><strong>Best overall:</strong> ${esc(top.name)}, the most actively maintained self-hostable ${esc(tool.name)} alternative (Health Score ${top.healthScore} of 100).</li>`);
  if (lightest) items.push(`<li><strong>Lightest:</strong> ${esc(lightest.name)} runs in ${ramText(lightest)} of RAM with ${esc(dbProse(lightest.footprint.database))}.</li>`);
  if (pi.length) items.push(`<li><strong>Raspberry Pi:</strong> ${esc(pi.slice(0, 5).join(", "))} publish official ARM64 images.</li>`);
  return `<div class="quick"><div class="qh">Quick answer</div><ul>${items.join("")}</ul></div>`;
}

function relatedTools(tool: EnrichedTool, all: EnrichedTool[]): EnrichedTool[] {
  const others = all.filter((t) => t.slug !== tool.slug);
  const same = others.filter((t) => t.category === tool.category);
  const rest = others.filter((t) => t.category !== tool.category);
  return [...same, ...rest].slice(0, 6);
}

// ---------- page chrome ----------
type Crumb = { name: string; url: string };
function breadcrumbLd(crumbs: Crumb[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
  };
}
function crumbsHtml(crumbs: Crumb[]): string {
  const parts = crumbs.map((c, i) => (i === crumbs.length - 1 ? `<span>${esc(c.name)}</span>` : `<a href="${esc(c.url.replace(SITE_URL, "") || "/")}">${esc(c.name)}</a>`));
  return `<nav class="crumbs" aria-label="Breadcrumb">${parts.join('<span class="sep" aria-hidden="true">/</span>')}</nav>`;
}

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
<header class="site"><a class="brand" href="/">${BRAND_MARK}<span>${esc(SITE_NAME)}</span></a><nav class="nav" aria-label="Main"><a href="/can-i-run/">Fit my server</a><a href="/collections/raspberry-pi/">Collections</a><a href="/methodology/">Methodology</a><a href="/api/">API</a><a href="/sponsor/">Sponsor</a></nav><span class="tag">Deploy data verified against official docs</span></header>
<main>`;
}

const foot = (updated: string): string => `</main>
<footer>
<p>The Self-Host Health Score adds commit activity (35), release recency (25), stars (25) and forks (15) from the live GitHub API. The deploy footprint (RAM, database, ARM64, one-click) is checked against each project's official documentation; <span class="est">est</span> marks a RAM figure the docs do not state. <a href="/methodology/">Methodology</a>. Machine-readable data: <a href="/api/tools.json">/api/tools.json</a> (<a href="/api/">API docs</a>).</p>
<p class="muted">Data updated ${esc(updated.slice(0, 10))}. <a href="${REPO_URL}" rel="noopener">Source code and dataset on GitHub</a> (code MIT, data CC BY 4.0). <a href="/about/">About</a>. <a href="/sponsor/">Sponsor</a>. Not affiliated with the listed vendors.</p>
</footer>
</body></html>`;

// ---------- tool page ----------
function toolPage(tool: EnrichedTool, all: EnrichedTool[]): string {
  const url = `${SITE_URL}/alternatives/${tool.slug}/`;
  const title = `Self-Hostable Open-Source ${tool.name} Alternatives (${YEAR})`;
  const desc = `${tool.alternatives.length} self-hostable open-source ${tool.name} alternatives ranked by a live Self-Host Health Score, with verified deploy footprint: minimum RAM, database, Raspberry Pi and ARM64 support, one-click deploy. Sort and filter to fit your hardware.`;

  const rows = tool.alternatives
    .map((a: EnrichedAlternative) => {
      const conf = a.footprintConfidence
        ? `<a class="conf c-${a.footprintConfidence}" href="#src-${esc(a.slug)}" title="Footprint confidence: ${esc(a.footprintConfidence)}. See sources below.">${esc(a.footprintConfidence)}</a>`
        : "";
      const ram = a.footprint.minRamMB > 0 ? a.footprint.minRamMB : 999999;
      const release = a.gh.latestReleaseTag ? `${esc(a.gh.latestReleaseTag)} <span class="muted">${rel(a.gh.latestReleaseAt)}</span>` : `<span class="muted">no releases</span>`;
      return `<tr id="${esc(a.slug)}" data-name="${esc(a.name.toLowerCase())}" data-health="${a.healthScore}" data-stars="${a.gh.stars ?? 0}" data-ram="${ram}" data-arm="${a.footprint.arm64 ? 1 : 0}" data-oneclick="${a.footprint.oneClick.length ? 1 : 0}">
<td class="name" data-label="Tool"><a href="${esc(a.homepage ?? "https://github.com/" + a.github)}" rel="nofollow">${esc(a.name)}</a>
  <a class="gh" href="https://github.com/${esc(a.github)}" rel="nofollow" title="GitHub repository">${ICON_GH}<span class="sr">GitHub</span></a>
  <div class="desc">${esc(a.description)}</div></td>
<td data-label="Health"><span class="badge ${healthClass(a.healthScore)}">${a.healthScore}</span><div class="muted sm">${healthLabel(a.healthScore)}</div></td>
<td class="num" data-label="Stars">${stars(a.gh.stars)}<div class="muted sm">${esc(a.gh.language ?? "")}</div></td>
<td data-label="Database" title="${esc(a.footprint.database)}">${esc(dbShort(a.footprint.database))}</td>
<td data-label="Min RAM">${ramCell(a)}</td>
<td class="ctr" data-label="ARM64 / Pi">${yesNo(a.footprint.arm64)} ${conf}</td>
<td data-label="One-click">${oneClickChips(a.footprint.oneClick)}</td>
<td class="sm" data-label="Activity">commit ${rel(a.gh.pushedAt)}<div>release ${release}</div><div class="muted">${esc(lic(a.gh.license))}</div></td>
</tr>`;
    })
    .join("\n");

  const lightest = tool.alternatives.filter((a) => a.footprint.minRamMB > 0).sort((a, b) => a.footprint.minRamMB - b.footprint.minRamMB)[0];
  const faq = [
    {
      q: `What is the best self-hostable ${tool.name} alternative?`,
      a: `By the live Self-Host Health Score, ${tool.alternatives[0]?.name} ranks highest at ${tool.alternatives[0]?.healthScore} of 100. The score combines commit activity, release recency, stars and forks from the GitHub API and is refreshed daily.`,
    },
    {
      q: `Which open-source ${tool.name} alternatives run on a Raspberry Pi?`,
      a: `Those with official ARM64 images: ${tool.alternatives.filter((a) => a.footprint.arm64).map((a) => a.name).join(", ") || "none at the moment"}. Check the minimum RAM column against your board.`,
    },
    {
      q: `Which ${tool.name} alternative needs the least RAM?`,
      a: lightest ? `${lightest.name}, at ${ramText(lightest)} with ${dbProse(lightest.footprint.database)}.` : "The documentation of these projects does not state a minimum.",
    },
    {
      q: `How is the deploy footprint verified?`,
      a: `Minimum RAM, database, ARM64 support and one-click templates are taken from each project's official documentation and linked below the table. Values the docs do not state are marked as estimates.`,
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
  const crumbs: Crumb[] = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: `${tool.name} alternatives`, url },
  ];

  const related = relatedTools(tool, all);

  return (
    head(title, desc, url, [itemList, faqLd, breadcrumbLd(crumbs)]) +
    `${crumbsHtml(crumbs)}
<h1>Self-hostable open-source <span class="hl">${esc(tool.name)}</span> alternatives</h1>
<p class="lead">${esc(tool.blurb)}</p>
${quickAnswer(tool)}
<p class="synth">${synthesize(tool)}</p>
${ctaBox()}
<div class="filters" role="group" aria-label="Filters">
<span class="muted sm">Filter</span>
<label><input type="checkbox" data-filter="arm"> Raspberry Pi / ARM64</label>
<label><input type="checkbox" data-filter="oneclick"> One-click deploy</label>
<label><input type="checkbox" data-filter="ram"> RAM 1 GB or less</label>
<span class="muted sm count"><span id="rowcount">${tool.alternatives.length}</span> of ${tool.alternatives.length} shown. Click a column header to sort.</span>
</div>
<div class="tablewrap"><table data-sortable>
<thead><tr><th>Tool</th><th data-key="health" class="sortable desc">Health</th><th data-key="stars" class="sortable">Stars</th><th>Database</th><th data-key="ram" class="sortable">Min RAM</th><th class="ctr">ARM64 / Pi</th><th>One-click</th><th>Activity</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>
<p class="muted sm legend">Health: 80 and above Thriving, 60 Healthy, 40 Steady, 20 At risk, below 20 Dormant. Confidence next to the ARM64 mark refers to the whole footprint row. <a href="/methodology/">How the numbers are produced</a>.</p>
${sourcesSection(tool)}
${badgeSection(tool)}
<section class="related"><h2>Related</h2><div class="relgrid">${related.map((t) => `<a href="/alternatives/${t.slug}/">${esc(t.name)} alternatives</a>`).join("")}</div></section>
<section class="faq"><h2>FAQ</h2>${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>
` +
    foot(new Date(nowMs).toISOString())
  );
}

// ---------- "fit my server" matcher ----------
function matcherPage(data: Enriched): string {
  const url = `${SITE_URL}/can-i-run/`;
  const title = `Which Self-Hostable Apps Fit My Server? RAM and ARM Matcher`;
  const desc = `Pick your available RAM and whether you run ARM64 (Raspberry Pi) and get the self-hostable open-source apps that fit, ranked by Self-Host Health Score.`;
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const jsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: title, url, description: desc, applicationCategory: "DeveloperApplication", operatingSystem: "Any" };
  const crumbs: Crumb[] = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Fit my server", url },
  ];
  return (
    head(title, desc, url, [jsonLd, breadcrumbLd(crumbs)]) +
    `${crumbsHtml(crumbs)}
<h1>Which apps fit <span class="hl">my server</span>?</h1>
<p class="lead">Set the memory you can spare and your CPU architecture. The list below shows every app of the ${altCount} in the directory whose documented minimum fits, best maintained first.</p>
<div class="matcher" id="matcher">
<label>RAM available
<select id="m-ram">
<option value="512">512 MB</option>
<option value="1024">1 GB</option>
<option value="2048" selected>2 GB</option>
<option value="4096">4 GB</option>
<option value="8192">8 GB or more</option>
</select></label>
<label><input type="checkbox" id="m-arm"> Raspberry Pi or ARM64 only</label>
<label><input type="checkbox" id="m-oc"> One-click deploy only</label>
<span class="muted"><b id="m-count">...</b> apps fit</span>
</div>
<div id="m-out" class="mlist"></div>
<noscript><p class="muted">This tool needs JavaScript. Browse the <a href="/">full directory</a> instead.</p></noscript>
<p class="muted sm">Minimums come from each project's official documentation. Apps without a documented minimum are listed only when you choose 8 GB or more.</p>
` +
    foot(data.generatedAt)
  );
}

// ---------- cross-category collections ----------
type Collection = { slug: string; title: string; h1: string; desc: string; filter: (a: EnrichedAlternative) => boolean };
const COLLECTIONS: Collection[] = [
  { slug: "raspberry-pi", title: `Self-Hostable Apps That Run on a Raspberry Pi (${YEAR})`, h1: `Self-hostable apps for a <span class="hl">Raspberry Pi</span>`, desc: "Open-source apps with official ARM64 images and a documented minimum of 2 GB RAM or less, suitable for a Raspberry Pi or another ARM single-board computer.", filter: (a) => a.footprint.arm64 && a.footprint.minRamMB > 0 && a.footprint.minRamMB <= 2048 },
  { slug: "lightweight", title: "Lightweight Self-Hostable Apps (512 MB RAM or Less)", h1: `Lightweight self-hostable apps <span class="hl">(512 MB or less)</span>`, desc: "Open-source apps whose official documentation states a minimum of 512 MB RAM or less, for small VPS plans and single-board computers.", filter: (a) => a.footprint.minRamMB > 0 && a.footprint.minRamMB <= 512 },
  { slug: "one-click", title: "Self-Hostable Apps With One-Click Deploy", h1: `Self-hostable apps with <span class="hl">one-click deploy</span>`, desc: "Open-source apps with a one-click template on Coolify, Railway, PikaPods, DigitalOcean or a similar platform.", filter: (a) => a.footprint.oneClick.length > 0 },
  { slug: "healthiest", title: "Healthiest Self-Hostable Open-Source Apps", h1: `The <span class="hl">healthiest</span> self-hostable apps`, desc: "The most actively maintained open-source apps in the directory: Self-Host Health Score 90 or higher.", filter: (a) => a.healthScore >= 90 },
];

function collectionPage(c: Collection, data: Enriched): string {
  const url = `${SITE_URL}/collections/${c.slug}/`;
  const flat = flatten(data).filter((f) => f.a.gh.found && c.filter(f.a)).sort((x, y) => y.a.healthScore - x.a.healthScore);
  const rows = flat
    .map(
      (f) => `<tr>
<td class="name" data-label="App"><a href="/alternatives/${f.toolSlug}/#${esc(f.a.slug)}">${esc(f.a.name)}</a><div class="desc">${esc(f.a.description)} <span class="muted">${esc(f.tool)} alternative.</span></div></td>
<td data-label="Health"><span class="badge ${healthClass(f.a.healthScore)}">${f.a.healthScore}</span></td>
<td class="num" data-label="Stars">${stars(f.a.gh.stars)}</td>
<td data-label="Min RAM">${ramCell(f.a)}</td>
<td class="ctr" data-label="ARM64 / Pi">${yesNo(f.a.footprint.arm64)}</td>
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
  const crumbs: Crumb[] = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Collections", url: `${SITE_URL}/collections/${COLLECTIONS[0].slug}/` },
    { name: c.h1.replace(/<[^>]+>/g, ""), url },
  ];
  const others = COLLECTIONS.filter((x) => x.slug !== c.slug);
  return (
    head(c.title, c.desc, url, [jsonLd, breadcrumbLd(crumbs)]) +
    `${crumbsHtml(crumbs)}
<h1>${c.h1}</h1>
<p class="lead">${esc(c.desc)}</p>
<p class="synth"><strong>${flat.length}</strong> apps qualify, ranked by Self-Host Health Score.</p>
<div class="tablewrap"><table>
<thead><tr><th>App</th><th>Health</th><th>Stars</th><th>Min RAM</th><th class="ctr">ARM64 / Pi</th><th>One-click</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>
<section class="related"><h2>More collections</h2><div class="relgrid">${others.map((x) => `<a href="/collections/${x.slug}/">${esc(x.h1.replace(/<[^>]+>/g, ""))}</a>`).join("")}<a href="/can-i-run/">Which apps fit my server?</a></div></section>
` +
    foot(data.generatedAt)
  );
}

// ---------- sponsor / get listed ----------
function sponsorPage(data: Enriched): string {
  const url = `${SITE_URL}/sponsor/`;
  const title = `Sponsor or Get Listed on ${SITE_NAME}`;
  const desc = `Put your open-source tool in front of developers and self-hosters who are comparing what to deploy. Featured listings and a free live badge for every listed project.`;
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const jsonLd = { "@context": "https://schema.org", "@type": "WebPage", name: title, url, description: desc };
  const mail = (sub: string) => `mailto:${CONTACT}?subject=${encodeURIComponent(sub)}`;
  const crumbs: Crumb[] = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sponsor", url },
  ];
  return (
    head(title, desc, url, [jsonLd, breadcrumbLd(crumbs)]) +
    `${crumbsHtml(crumbs)}
<h1>Reach people who are <span class="hl">choosing what to self-host</span></h1>
<p class="lead">${SITE_NAME} compares ${altCount} open-source apps across ${data.tools.length} categories. Readers arrive to compare alternatives by RAM, ARM64 support, one-click deploy and project health, and leave with one to install.</p>
<div class="grid">
<div class="card price">
<div class="cat">Featured listing</div>
<h3>Founding sponsor</h3>
<p class="big">$49<span class="muted sm"> per month</span></p>
<ul>
<li>Your tool pinned to the top of its category page, marked as sponsored</li>
<li>A do-follow link to your site and a "Verified" label</li>
<li>A rotating slot on the homepage and in the server matcher</li>
<li>Your entry stays in the <code>/api/tools.json</code> feed that answer engines read</li>
</ul>
<a class="bigcta" href="${mail("Founding featured listing")}">Email to request a slot</a>
<p class="muted sm">Founding price for the first 10 sponsors, kept for as long as you stay. Standard price $149 per month. Cancel any time.</p>
</div>
<div class="card price">
<div class="cat">Free for every listed project</div>
<h3>Live Self-Host Score badge</h3>
<p class="big">Free</p>
<ul>
<li>Shows your current score and ranking band, refreshed daily</li>
<li>Self-hosted SVG plus a Shields.io endpoint, no sign-up</li>
<li>Fits README files and "open-source alternative to X" landing pages</li>
<li>Links back to your row in the directory</li>
</ul>
<a class="bigcta" href="/">Open your category page and copy the snippet</a>
<p class="muted sm">Every listed project qualifies. The snippet is under "Add the live Self-Host Score badge" on each category page.</p>
</div>
</div>
<section class="meth"><h2>What sponsorship does and does not change</h2>
<p>A featured slot changes placement only. Health Scores come from the GitHub API and footprint values come from official documentation; neither is edited for sponsors. Sponsored links carry <code>rel="sponsored"</code> and are labelled on the page. If your project is not listed yet, open a pull request against <a href="${REPO_URL}" rel="noopener">the dataset on GitHub</a> or email us.</p>
<p>Custom placements (newsletter mention, category sponsorship): <a href="${mail("Sponsorship question")}">${CONTACT}</a>.</p></section>
` +
    foot(data.generatedAt)
  );
}

// ---------- methodology ----------
function methodologyPage(data: Enriched): string {
  const url = `${SITE_URL}/methodology/`;
  const title = `Methodology: Self-Host Health Score and Deploy Footprint`;
  const desc = `How ${SITE_NAME} computes the 0 to 100 Self-Host Health Score from GitHub data and how the deploy footprint (RAM, database, ARM64, one-click) is verified against official documentation.`;
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: title, url, description: desc, dateModified: data.generatedAt.slice(0, 10), author: { "@type": "Organization", name: SITE_NAME } };
  const crumbs: Crumb[] = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Methodology", url },
  ];
  return (
    head(title, desc, url, [jsonLd, breadcrumbLd(crumbs)]) +
    `${crumbsHtml(crumbs)}
<h1>How the numbers are <span class="hl">produced</span></h1>
<p class="lead">Two kinds of data appear on every page: a Self-Host Health Score computed from the GitHub API, and a deploy footprint curated by hand from official documentation. Both are explained here in full so you can judge them.</p>

<section class="doc" id="score"><h2>Self-Host Health Score (0 to 100)</h2>
<p>The score answers one question: is this project alive and used enough to run in production? It is the sum of four components, each computed from a single GitHub repository fetch plus the latest release. Component values are rounded before summing.</p>
<div class="tablewrap"><table class="doc-table">
<thead><tr><th>Component</th><th>Max</th><th>Input</th><th>Rule</th></tr></thead>
<tbody>
<tr><td data-label="Component">Activity</td><td class="num" data-label="Max">35</td><td data-label="Input">Days since the last commit (push)</td><td data-label="Rule">Full points at 30 days or less, falling linearly to zero at 365 days.</td></tr>
<tr><td data-label="Component">Releases</td><td class="num" data-label="Max">25</td><td data-label="Input">Days since the latest published release</td><td data-label="Rule">Full points at 90 days or less, falling linearly to zero at 540 days. Projects that never publish releases get a fixed 5 points.</td></tr>
<tr><td data-label="Component">Maturity</td><td class="num" data-label="Max">25</td><td data-label="Input">Stars</td><td data-label="Rule">log10(stars + 1) divided by log10(50,001), times 25. Saturates near 50,000 stars so very large projects do not crowd out the rest.</td></tr>
<tr><td data-label="Component">Adoption</td><td class="num" data-label="Max">15</td><td data-label="Input">Forks</td><td data-label="Rule">log10(forks + 1) divided by log10(10,001), times 15. Saturates near 10,000 forks.</td></tr>
</tbody></table></div>
<p>Archived repositories and repositories that cannot be fetched score 0 in every component. A high score therefore means recent commits, recent releases and an established user base. It does not measure code quality, security or how easy the app is to operate.</p>
<h3>Bands</h3>
<p>80 and above: Thriving. 60 to 79: Healthy. 40 to 59: Steady. 20 to 39: At risk. Below 20: Dormant. Bands are labels for the same number and carry no extra weighting.</p>
<h3>Refresh cadence</h3>
<p>The GitHub data is fetched once a day by a scheduled job in <a href="${REPO_URL}" rel="noopener">the public repository</a>, the site is rebuilt and the dataset is committed. The date in the footer is the date of the last successful run. Scores move by a few points as commits and releases age.</p>
</section>

<section class="doc" id="footprint"><h2>Deploy footprint</h2>
<p>The footprint records what it takes to run the app yourself: the primary database, the minimum RAM for a small instance, whether official ARM64 images exist (Raspberry Pi, Apple Silicon servers), the supported deploy methods, and one-click templates on hosting platforms. Each value was read from the project's official documentation, Docker Hub or GitHub Container Registry listing, or official platform templates. The links are listed under "Footprint sources and confidence" on every category page.</p>
<h3>Confidence levels</h3>
<ul>
<li><strong>High</strong>: the documentation states the value directly.</li>
<li><strong>Medium</strong>: the value is derived from official material, for example a docker-compose file or image tags, but no single stated number exists.</li>
<li><strong>Low</strong>: the value is an estimate based on community reports.</li>
</ul>
<p>When the confidence is not high, the RAM figure is marked <span class="est">est</span> on the site and prefixed with "about" in prose. A missing minimum is shown as n/a and the app is excluded from RAM filters.</p>
<h3>Inclusion rules</h3>
<p>An app is listed only if it is open source, can be deployed on your own infrastructure with documented instructions, and has a public GitHub repository. Hosted-only products and source-available products without a self-hosting path are excluded. Sponsorship affects placement only, never a score or a footprint value.</p>
</section>

<section class="doc" id="limits"><h2>Known limits</h2>
<ul>
<li>Stars and forks reward popularity, which is not the same as suitability for your case.</li>
<li>Projects that develop on GitLab or a self-hosted forge and only mirror to GitHub may show stale activity.</li>
<li>Minimum RAM depends on usage. The documented minimum is for a small instance, not for a team of fifty.</li>
<li>The dataset currently covers ${altCount} alternatives in ${data.tools.length} categories. Missing a project? <a href="/about/#contribute">Add it</a>.</li>
</ul>
</section>
` +
    foot(data.generatedAt)
  );
}

// ---------- API docs ----------
function apiPage(data: Enriched): string {
  const url = `${SITE_URL}/api/`;
  const title = `API: Dataset, Feed and Badges`;
  const desc = `Free JSON feed of ${SITE_NAME}: every self-hostable alternative with its Health Score and verified deploy footprint, plus per-project badge endpoints and an llms.txt index. CC BY 4.0.`;
  const sample = flatten(data).find((f) => f.a.slug === "n8n") ?? flatten(data)[0];
  const jsonLd = { "@context": "https://schema.org", "@type": "TechArticle", headline: title, url, description: desc, dateModified: data.generatedAt.slice(0, 10) };
  const crumbs: Crumb[] = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: "API", url },
  ];
  const fields: [string, string][] = [
    ["name, slug, github, homepage", "Project name, URL slug (used by badges and anchors), GitHub owner/repo, official site"],
    ["description", "One-line curated description"],
    ["healthScore", "Self-Host Health Score, integer 0 to 100"],
    ["healthBreakdown", "activity, releases, maturity, adoption (points per component)"],
    ["stars, forks, openIssues, language, license", "From the GitHub API at the time of the last refresh"],
    ["lastCommit, latestReleaseTag, latestReleaseAt, createdAt", "ISO 8601 timestamps and the latest release tag, or null"],
    ["database, minRamMB, arm64, deploy, oneClick", "Deploy footprint: primary database, minimum RAM in MB (null if not documented), official ARM64 images, deploy methods, one-click platforms"],
    ["footprintConfidence, footprintSources", "high / medium / low and the documentation URLs the footprint was read from"],
    ["badge", "URLs of this project's SVG badge and Shields endpoint"],
  ];
  return (
    head(title, desc, url, [jsonLd, breadcrumbLd(crumbs)]) +
    `${crumbsHtml(crumbs)}
<h1>Dataset, feed and <span class="hl">badges</span></h1>
<p class="lead">Everything on this site is available as JSON. The data is licensed CC BY 4.0: use it in your product, research or answer engine with a link back to ${SITE_URL}.</p>

<section class="doc" id="feed"><h2>Feed: <code>/api/tools.json</code></h2>
<p>One file with every category and every alternative, regenerated daily. Current size: ${data.tools.length} tools, ${flatten(data).length} alternatives, updated ${esc(data.generatedAt.slice(0, 10))}. The same file is committed to <a href="${REPO_URL}/blob/main/data/tools.json" rel="noopener">data/tools.json in the repository</a>, so you can pin a version or diff changes.</p>
<pre><code>GET ${SITE_URL}/api/tools.json

{
  "site": "${SITE_NAME}",
  "updated": "${esc(data.generatedAt)}",
  "license": "CC BY 4.0 ...",
  "tools": [
    { "name": "${esc(sample.tool)}", "slug": "${esc(sample.toolSlug)}", "category": "${esc(sample.cat)}",
      "page": "${SITE_URL}/alternatives/${esc(sample.toolSlug)}/",
      "alternatives": [ { "name": "${esc(sample.a.name)}", "slug": "${esc(sample.a.slug)}", "healthScore": ${sample.a.healthScore}, "minRamMB": ${sample.a.footprint.minRamMB || null}, ... } ] }
  ]
}</code></pre>
<div class="tablewrap"><table class="doc-table">
<thead><tr><th>Field (per alternative)</th><th>Meaning</th></tr></thead>
<tbody>${fields.map(([f, m]) => `<tr><td data-label="Field"><code>${esc(f)}</code></td><td data-label="Meaning">${esc(m)}</td></tr>`).join("")}</tbody></table></div>
<p>There is no authentication and no rate limit beyond normal CDN behaviour. The file is served with long cache headers and changes once a day, so fetch it at most a few times per day.</p>
</section>

<section class="doc" id="badges"><h2>Badges: <code>/api/badge/&lt;slug&gt;.svg</code> and <code>.json</code></h2>
<p>Every listed project has a self-hosted SVG badge and a <a href="https://shields.io/badges/endpoint-badge" rel="nofollow noopener">Shields.io endpoint</a> file. Both show the current score and band and are regenerated with the daily refresh. Find the slug in the feed or in the "Add the live Self-Host Score badge" block on the project's category page.</p>
<p><img src="/api/badge/${esc(sample.a.slug)}.svg" alt="Example badge for ${esc(sample.a.name)}" height="20"></p>
<pre><code>[![Self-Host Score](${SITE_URL}/api/badge/${esc(sample.a.slug)}.svg)](${SITE_URL}/alternatives/${esc(sample.toolSlug)}/#${esc(sample.a.slug)})

https://img.shields.io/endpoint?url=${SITE_URL}/api/badge/${esc(sample.a.slug)}.json</code></pre>
</section>

<section class="doc" id="llms"><h2>For answer engines: <code>/llms.txt</code></h2>
<p><a href="/llms.txt">llms.txt</a> lists every page with a one-line summary and points to the feed. Pages carry schema.org ItemList, FAQPage, BreadcrumbList and Dataset markup. When you quote a number, please include the page URL and the "data updated" date.</p>
</section>

<section class="doc" id="license"><h2>License and attribution</h2>
<p>Data: <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>. Attribution example: "Data: SelfHostScore (selfhostscore.com), CC BY 4.0". Code of the generator: MIT, in <a href="${REPO_URL}" rel="noopener">the repository</a>.</p>
</section>
` +
    foot(data.generatedAt)
  );
}

// ---------- about ----------
function aboutPage(data: Enriched): string {
  const url = `${SITE_URL}/about/`;
  const title = `About ${SITE_NAME}`;
  const desc = `${SITE_NAME} is an independent directory of self-hostable open-source alternatives with a daily GitHub Health Score and deploy data verified against official documentation. How it is run, how to add a project, how to reach us.`;
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const jsonLd = { "@context": "https://schema.org", "@type": "AboutPage", name: title, url, description: desc };
  const crumbs: Crumb[] = [
    { name: "Home", url: `${SITE_URL}/` },
    { name: "About", url },
  ];
  return (
    head(title, desc, url, [jsonLd, breadcrumbLd(crumbs)]) +
    `${crumbsHtml(crumbs)}
<h1>About <span class="hl">${SITE_NAME}</span></h1>
<p class="lead">A directory for people who would rather run software than rent it. ${altCount} open-source apps that replace ${data.tools.length} common SaaS products, with the two things other lists leave out: whether the project is still alive, and what it takes to run it.</p>

<section class="doc"><h2>What is different here</h2>
<ul>
<li><strong>Self-hostable only.</strong> Every entry has documented instructions for running it on your own infrastructure.</li>
<li><strong>A live Health Score.</strong> Commit activity, release recency, stars and forks from the GitHub API, refreshed daily. <a href="/methodology/">Full formula</a>.</li>
<li><strong>A verified deploy footprint.</strong> Minimum RAM, database, ARM64 support and one-click templates, read from official documentation with the sources linked on each page.</li>
<li><strong>Open data.</strong> The whole dataset is published as JSON under CC BY 4.0 and versioned in a public repository.</li>
</ul>
</section>

<section class="doc" id="contribute"><h2>Add or correct a project</h2>
<p>The dataset lives in <a href="${REPO_URL}" rel="noopener">github.com/selfhostscore/self-hosted-alternatives</a>. To add an alternative or fix a footprint value, edit <code>data/seed.json</code> and open a pull request with a link to the official documentation that supports the change. The daily job recomputes scores and rebuilds the site after a merge. If you prefer email, write to <a href="mailto:${CONTACT}">${CONTACT}</a> with the same information.</p>
</section>

<section class="doc"><h2>How the site is funded</h2>
<p>Through <a href="/sponsor/">featured listings</a> and clearly labelled partner links to managed hosting providers. Sponsorship affects placement only. Scores and footprint data are never edited for sponsors.</p>
</section>

<section class="doc"><h2>Contact</h2>
<p><a href="mailto:${CONTACT}">${CONTACT}</a>. ${SITE_NAME} is an independent project and is not affiliated with any of the vendors or open-source projects it lists. Product names belong to their owners.</p>
</section>
` +
    foot(data.generatedAt)
  );
}

// ---------- homepage ----------
function homePage(data: Enriched): string {
  const url = `${SITE_URL}/`;
  const title = `${SITE_NAME}: Self-Hostable Open-Source Alternatives, Verified`;
  const desc = `Self-hostable open-source alternatives to popular SaaS, ranked by a live GitHub Self-Host Health Score, with deploy data verified against official docs: minimum RAM, database, Raspberry Pi support and one-click deploy.`;
  const cards = data.tools
    .map((t) => {
      const top = t.alternatives[0];
      return `<a class="card" href="/alternatives/${t.slug}/" data-name="${esc((t.name + " " + t.category).toLowerCase())}">
<div class="cat">${esc(t.category)}</div>
<h3>${esc(t.name)} alternatives</h3>
<div class="muted sm">${t.alternatives.length} options. Top: ${esc(top?.name ?? "")}, score ${top?.healthScore ?? "n/a"}.</div>
</a>`;
    })
    .join("\n");
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const thriving = flatten(data).filter((f) => f.a.healthScore >= 80).length;
  const pi = flatten(data).filter((f) => f.a.footprint.arm64).length;
  const collectionPage = { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url, description: desc };
  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${SITE_NAME}: self-hostable open-source alternatives with health score and deploy footprint`,
    description: `${altCount} self-hostable open-source alternatives across ${data.tools.length} SaaS categories, each with a GitHub-derived health score and a deploy footprint verified against official documentation (RAM, database, ARM64, one-click).`,
    url,
    license: "https://creativecommons.org/licenses/by/4.0/",
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    distribution: { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE_URL}/api/tools.json` },
    isAccessibleForFree: true,
    dateModified: data.generatedAt.slice(0, 10),
  };
  return (
    head(title, desc, url, [collectionPage, dataset]) +
    `<h1>Self-hostable, open-source alternatives, <span class="hl">verified</span></h1>
<p class="lead">One page per SaaS product. Each alternative is ranked by a live <strong>Self-Host Health Score</strong> from the GitHub API and comes with a <strong>deploy footprint</strong> checked against official documentation: minimum RAM, database, Raspberry Pi and ARM64 support, one-click deploy.</p>
<div class="stats" aria-label="Directory statistics"><div><b>${data.tools.length}</b><span>categories</span></div><div><b>${altCount}</b><span>alternatives</span></div><div><b>${thriving}</b><span>scored 80 or higher</span></div><div><b>${pi}</b><span>with official ARM64 images</span></div><div><b>${esc(data.generatedAt.slice(0, 10))}</b><span>data updated</span></div></div>
<a class="bigcta" href="/can-i-run/"><strong>Which apps fit my server?</strong> Pick your RAM and architecture and get the matching list.</a>
<input id="search" type="search" placeholder="Search ${data.tools.length} categories, for example notion, backup, crm, photos" autocomplete="off" aria-label="Search categories">
<div class="grid">${cards}</div>
<section id="collections" class="meth"><h2>Collections</h2><div class="relgrid">${COLLECTIONS.map((c) => `<a href="/collections/${c.slug}/">${esc(c.h1.replace(/<[^>]+>/g, ""))}</a>`).join("")}</div></section>
<section id="methodology" class="meth"><h2>How the Self-Host Health Score works</h2>
<p>A 0 to 100 total from four GitHub signals: commit recency (up to 35 points), latest release recency (25), stars on a log scale (25) and forks on a log scale (15). Archived or missing repositories score 0. The deploy footprint is read from each project's official documentation and the sources are linked on every page; <span class="est">est</span> marks a RAM figure the docs do not state. <a href="/methodology/">Read the full methodology</a> or fetch the data from <a href="/api/tools.json">/api/tools.json</a>.</p></section>
` +
    foot(data.generatedAt)
  );
}

// ---------- machine-readable feed ----------
function jsonFeed(data: Enriched): string {
  return JSON.stringify(
    {
      site: SITE_NAME,
      url: SITE_URL,
      updated: data.generatedAt,
      license: "CC BY 4.0. Free to use with attribution to SelfHostScore (https://selfhostscore.com).",
      methodology: `${SITE_URL}/methodology/`,
      docs: `${SITE_URL}/api/`,
      tools: data.tools.map((t) => ({
        name: t.name,
        slug: t.slug,
        category: t.category,
        page: `${SITE_URL}/alternatives/${t.slug}/`,
        alternatives: t.alternatives.map((a) => ({
          name: a.name,
          slug: a.slug,
          github: a.github,
          homepage: a.homepage ?? null,
          description: a.description,
          healthScore: a.healthScore,
          healthBreakdown: a.healthBreakdown,
          stars: a.gh.stars ?? null,
          forks: a.gh.forks ?? null,
          openIssues: a.gh.openIssues ?? null,
          language: a.gh.language ?? null,
          license: lic(a.gh.license) || null,
          lastCommit: a.gh.pushedAt ?? null,
          latestReleaseTag: a.gh.latestReleaseTag ?? null,
          latestReleaseAt: a.gh.latestReleaseAt ?? null,
          createdAt: a.gh.createdAt ?? null,
          database: a.footprint.database,
          minRamMB: a.footprint.minRamMB || null,
          arm64: a.footprint.arm64,
          deploy: a.footprint.deploy,
          oneClick: a.footprint.oneClick,
          footprintConfidence: a.footprintConfidence ?? null,
          footprintSources: a.footprintSources ?? [],
          badge: { svg: `${SITE_URL}/api/badge/${a.slug}.svg`, shields: `${SITE_URL}/api/badge/${a.slug}.json` },
        })),
      })),
    },
    null,
    2,
  );
}

function llmsTxt(data: Enriched): string {
  const altCount = data.tools.reduce((n, t) => n + t.alternatives.length, 0);
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> Directory of self-hostable open-source alternatives to popular SaaS. Each alternative has a live GitHub Self-Host Health Score (0 to 100) and a deploy footprint verified against official documentation: minimum RAM, database, ARM64 and Raspberry Pi support, one-click deploy availability.`,
    "",
    `Machine-readable dataset: ${SITE_URL}/api/tools.json (CC BY 4.0, documented at ${SITE_URL}/api/)`,
    `Updated: ${data.generatedAt.slice(0, 10)}. ${data.tools.length} tools, ${altCount} alternatives. Please cite the page URL and the update date.`,
    "",
    "## Reference pages",
    `- [Methodology](${SITE_URL}/methodology/): exact Health Score formula, footprint verification and confidence levels, inclusion rules.`,
    `- [API and badges](${SITE_URL}/api/): feed schema, per-project badge endpoints, license.`,
    `- [About](${SITE_URL}/about/): who runs the site, how to add or correct a project, contact.`,
    `- [Which apps fit my server](${SITE_URL}/can-i-run/): filter the directory by RAM and ARM64.`,
    "",
    "## Tool pages",
    ...data.tools.map((t) => `- [${t.name} alternatives](${SITE_URL}/alternatives/${t.slug}/): ${t.alternatives.length} self-hostable open-source ${t.name} alternatives, ranked; top: ${t.alternatives[0]?.name ?? "n/a"} (${t.alternatives[0]?.healthScore ?? "n/a"}/100).`),
    "",
    "## Collections",
    ...COLLECTIONS.map((c) => `- [${c.h1.replace(/<[^>]+>/g, "")}](${SITE_URL}/collections/${c.slug}/): ${c.desc}`),
    "",
  ];
  return lines.join("\n");
}

// GitHub-ready markdown export (README body)
function awesomeMd(data: Enriched): string {
  const out = [
    `# SelfHostScore: self-hostable open-source alternatives`,
    "",
    `Open-source, self-hostable alternatives to popular SaaS, each with a **Self-Host Health Score** (live GitHub activity, releases, stars and forks) and a **deploy footprint** verified against official documentation (minimum RAM, database, ARM64 and Raspberry Pi support, one-click deploy).`,
    "",
    `Interactive site: ${SITE_URL}. Dataset: ${SITE_URL}/api/tools.json. Methodology: ${SITE_URL}/methodology/. Updated ${data.generatedAt.slice(0, 10)}.`,
    "",
  ];
  for (const t of data.tools) {
    out.push(`## ${t.name} alternatives`, "", `| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |`, `|---|---|---|---|---|---|---|`);
    for (const a of t.alternatives) {
      out.push(
        `| [${a.name}](https://github.com/${a.github}) | ${a.healthScore} | ${stars(a.gh.stars)} | ${dbShort(a.footprint.database)} | ${a.footprint.minRamMB ? `${isEst(a) ? "about " : ""}${a.footprint.minRamMB} MB` : "n/a"} | ${a.footprint.arm64 ? "Yes" : "No"} | ${a.footprint.oneClick.length ? "Yes" : "No"} |`,
      );
    }
    out.push(`\nFull details, sources and badges: ${SITE_URL}/alternatives/${t.slug}/\n`);
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
      th.setAttribute('tabindex','0'); th.setAttribute('role','button');
      var sort=function(){
        var key=th.getAttribute('data-key'), asc=th.getAttribute('data-asc')!=='1';
        table.querySelectorAll('th[data-key]').forEach(function(h){h.removeAttribute('data-asc');h.classList.remove('asc','desc');});
        th.setAttribute('data-asc',asc?'1':'0'); th.classList.add(asc?'asc':'desc');
        rows().sort(function(a,b){var av=+a.getAttribute('data-'+key),bv=+b.getAttribute('data-'+key);return asc?av-bv:bv-av;}).forEach(function(r){tbody.appendChild(r);});
      };
      th.addEventListener('click',sort);
      th.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();sort();}});
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
    if(location.hash){var target=document.getElementById(location.hash.slice(1));if(target&&target.tagName==='TR'){target.classList.add('hit');}}
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
      data.tools.forEach(function(t){t.alternatives.forEach(function(a){alts.push({tool:t.name,slug:t.slug,aslug:a.slug,name:a.name,health:a.healthScore,ram:a.minRamMB,arm:a.arm64,oc:(a.oneClick||[]).length>0,db:a.database});});});
      function render(){
        var maxRam=+ramSel.value,arm=armChk.checked,oc=ocChk.checked;
        var fit=alts.filter(function(a){var r=a.ram&&a.ram>0?a.ram:999999;if(r>maxRam)return false;if(arm&&!a.arm)return false;if(oc&&!a.oc)return false;return true;}).sort(function(x,y){return y.health-x.health;});
        mc.textContent=fit.length;
        out.innerHTML=fit.map(function(a){var meta=[esc(a.tool)+' alternative',(a.ram>0?a.ram+' MB':'RAM not documented')];if(a.arm)meta.push('ARM64');if(a.oc)meta.push('one-click');return '<a class="mrow" href="/alternatives/'+a.slug+'/#'+a.aslug+'"><span class="badge '+hc(a.health)+'">'+a.health+'</span> <b>'+esc(a.name)+'</b> <span class="muted">'+meta.join(', ')+'</span></a>';}).join('') || '<p class="muted">Nothing fits. Choose more RAM or clear a filter.</p>';
      }
      ramSel.addEventListener('change',render);armChk.addEventListener('change',render);ocChk.addEventListener('change',render);render();
    }).catch(function(){out.innerHTML='<p class="muted">Could not load the data.</p>';});
  }
})();`;

// ---------- css ----------
const CSS = `:root{--bg:#0f1115;--panel:#171a21;--panel2:#11141a;--ink:#e8eaed;--ink2:#c7ccd6;--muted:#9aa3b2;--line:#262b36;--line2:#303642;--acc:#3ddc97;--acc-dim:#1f4736;--acc2:#7aa2ff;--warn:#e8c468;--bad:#d9676a;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Inter,sans-serif;background:var(--bg);color:var(--ink);font-variant-numeric:tabular-nums}
a{color:var(--acc2);text-decoration:none}a:hover{text-decoration:underline}
code{font-family:var(--mono);font-size:.88em;background:var(--panel2);border:1px solid var(--line);border-radius:4px;padding:1px 5px;color:var(--ink2)}
pre{background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:14px 16px;overflow-x:auto;font-size:13px;line-height:1.5}
pre code{background:none;border:0;padding:0;font-size:inherit;color:var(--ink)}
.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
header.site{display:flex;gap:22px;align-items:center;flex-wrap:wrap;padding:14px 24px;border-bottom:1px solid var(--line);background:var(--panel)}
.brand{display:inline-flex;align-items:center;gap:9px;font-weight:700;font-size:17px;letter-spacing:-.01em;color:var(--ink)}
.brand .bm{border-radius:6px;box-shadow:0 0 0 1px var(--line2)}
.nav{display:flex;gap:4px;flex-wrap:wrap}.nav a{font-size:14px;color:var(--ink2);padding:5px 9px;border-radius:6px}.nav a:hover{background:var(--panel2);text-decoration:none;color:var(--ink)}
.tag{color:var(--muted);font-size:12.5px;margin-left:auto;letter-spacing:.01em}
main{max-width:1100px;margin:0 auto;padding:32px 24px 8px}
h1{font-size:32px;line-height:1.15;margin:.1em 0 .35em;letter-spacing:-.02em;font-weight:750}
h2{font-size:20px;letter-spacing:-.01em;margin:1.2em 0 .5em}h3{font-size:16px;margin:1.1em 0 .4em}
.hl{color:var(--acc)}
.lead{color:var(--ink2);font-size:17.5px;max-width:74ch;margin:.2em 0 1em}
.stats{display:flex;flex-wrap:wrap;gap:0;border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:4px 0 18px;background:var(--panel)}
.stats div{flex:1 1 150px;padding:12px 16px;border-right:1px solid var(--line);display:flex;flex-direction:column;gap:2px}.stats div:last-child{border-right:0}
.stats b{font-size:22px;letter-spacing:-.02em;font-weight:750}.stats span{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.bigcta{display:block;background:var(--panel);border:1px solid var(--line2);border-left:3px solid var(--acc);border-radius:10px;padding:14px 18px;margin:14px 0 8px;font-size:16px;color:var(--ink2)}
.bigcta:hover{border-color:var(--acc);text-decoration:none}.bigcta strong{color:var(--ink);margin-right:6px}
.quick{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 18px 4px;margin:14px 0;max-width:80ch}
.quick .qh{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--acc);font-weight:700;margin:4px 0 0}
.quick ul{margin:6px 0 10px;padding-left:18px}.quick li{margin:4px 0;color:var(--ink2)}
.synth{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--acc);padding:14px 16px;border-radius:8px;max-width:80ch;color:var(--ink2)}
.cta{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin:14px 0;font-size:14.5px;max-width:80ch;color:var(--ink2)}.cta a{color:var(--acc)}
.crumbs{color:var(--muted);font-size:13px;margin-bottom:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.crumbs .sep{color:var(--line2)}.crumbs span:last-child{color:var(--ink2)}
#search{width:100%;max-width:520px;padding:11px 14px;border-radius:9px;border:1px solid var(--line2);background:var(--panel);color:var(--ink);font-size:15px;margin:6px 0 8px}
#search::placeholder{color:var(--muted)}
#search:focus,#m-ram:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px rgba(61,220,151,.15)}
.filters,.matcher{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:18px 0 0}
.filters .count{margin-left:auto}
.matcher{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px;font-size:15px;gap:16px}
.matcher label{display:inline-flex;gap:8px;align-items:center}
.matcher select{background:var(--bg);color:var(--ink);border:1px solid var(--line2);border-radius:7px;padding:6px 10px;font-size:15px}
.filters label{font-size:13.5px;color:var(--ink2);cursor:pointer;user-select:none;display:inline-flex;gap:7px;align-items:center;background:var(--panel);border:1px solid var(--line2);padding:6px 11px;border-radius:999px}
.filters label:hover{border-color:var(--acc)}.filters label:has(input:checked){border-color:var(--acc);color:var(--ink);background:var(--acc-dim)}
.filters input,.matcher input{accent-color:var(--acc);margin:0}
.mlist{margin:16px 0;display:flex;flex-direction:column;gap:6px}
.mrow{display:flex;gap:10px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:9px 12px;color:var(--ink)}
.mrow:hover{border-color:var(--acc);text-decoration:none}.mrow .muted{font-size:13px}
.tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:10px;margin:12px 0 0;background:var(--panel)}
table{border-collapse:collapse;width:100%;font-size:14px;min-width:880px}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--panel2);color:var(--muted);font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;position:sticky;top:0;z-index:1;white-space:nowrap}
th.sortable{cursor:pointer;padding-right:22px;position:sticky}th.sortable:hover{color:var(--ink)}
th.sortable::after{content:"";position:absolute;right:9px;top:50%;margin-top:-5px;border:4px solid transparent;border-bottom:5px solid currentColor;opacity:.35}
th.asc::after{opacity:1;border-bottom-color:var(--acc)}
th.desc::after{margin-top:-1px;border-bottom:4px solid transparent;border-top:5px solid var(--acc);opacity:1}
tbody tr:hover td{background:rgba(255,255,255,.025)}tr.hit td{background:rgba(61,220,151,.08)}
tr:last-child td{border-bottom:0}
td.name a{font-weight:600;color:var(--ink)}td.name .gh{color:var(--muted);font-weight:400;margin-left:6px;vertical-align:-1px}td.name .gh:hover{color:var(--ink)}
td.ctr,th.ctr{text-align:center}td.num{font-variant-numeric:tabular-nums}td[data-label="Min RAM"],td[data-label="Activity"]{white-space:nowrap}
.desc{color:var(--muted);font-size:12.5px;margin-top:3px;max-width:46ch;line-height:1.45}
.muted{color:var(--muted)}.sm{font-size:12.5px}.legend{margin:10px 0 0;max-width:90ch}
.est{font-size:10px;color:var(--muted);border:1px solid var(--line2);border-radius:4px;padding:0 4px;vertical-align:middle;letter-spacing:.03em}
.badge{display:inline-block;min-width:34px;text-align:center;padding:3px 8px;border-radius:6px;font-weight:700;color:#0b0d10;font-variant-numeric:tabular-nums}
.h-thriving{background:#3ddc97}.h-healthy{background:#76d0a3}.h-steady{background:#e8c468}.h-risk{background:#e89c5a}.h-dormant{background:#d9676a}
.chip{display:inline-block;padding:2px 8px;border-radius:5px;font-size:11.5px;border:1px solid var(--line2);background:var(--panel2);color:var(--ink2);margin:1px 0}a.chip:hover{border-color:var(--acc);text-decoration:none}
.bool{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px}
.bool.yes{color:var(--acc);background:rgba(61,220,151,.12)}.bool.no{color:var(--bad);background:rgba(217,103,106,.12)}
.conf{font-size:10.5px;vertical-align:middle;text-transform:uppercase;letter-spacing:.04em;margin-left:4px}a.conf{text-decoration:none;border-bottom:1px dotted currentColor}.c-high{color:var(--acc)}.c-medium{color:var(--warn)}.c-low{color:var(--bad)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin:16px 0 22px}
.card{display:block;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px;transition:border-color .15s}
.card:hover{border-color:var(--acc);text-decoration:none}
.card h3{margin:.25em 0;font-size:16.5px;color:var(--ink);letter-spacing:-.01em}
.price{display:flex;flex-direction:column}.price .big{font-size:34px;font-weight:800;margin:4px 0;letter-spacing:-.02em}
.price ul{padding-left:18px;color:var(--ink2);font-size:14px;flex:1;margin:8px 0}.price li{margin:5px 0}
.price .bigcta{margin:8px 0 4px;text-align:center;font-size:15px;padding:11px 14px;border-left-width:1px}
.cat{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--acc2)}
.related,.meth{margin:30px 0}.related h2,.meth h2{font-size:18px;margin-top:0}
.relgrid{display:flex;flex-wrap:wrap;gap:8px}.relgrid a{background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:7px 11px;font-size:13.5px;color:var(--ink2)}
.relgrid a:hover{border-color:var(--acc);text-decoration:none;color:var(--ink)}
.faq{margin:30px 0}.faq summary{cursor:pointer;font-weight:600;padding:10px 0;border-bottom:1px solid var(--line)}
.faq p{color:var(--ink2)}
.meth{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px 20px}.meth p{color:var(--ink2);max-width:90ch}
.doc{max-width:86ch;margin:26px 0}.doc p,.doc li{color:var(--ink2)}.doc h2{border-bottom:1px solid var(--line);padding-bottom:6px}.doc ul{padding-left:20px}.doc li{margin:5px 0}
.doc-table{min-width:0}.doc-table td{vertical-align:top}
details.embed,details.sources{margin:16px 0 0;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:4px 16px 8px}
details.embed summary,details.sources summary{cursor:pointer;font-weight:600;padding:9px 0;color:var(--ink2)}details[open] summary{color:var(--ink)}
.snip{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:7px 0;font-size:13.5px}.snip code{font-size:12px;word-break:break-all;user-select:all;padding:3px 7px}
details.sources ul{padding-left:18px;margin:4px 0 8px}details.sources li{margin:6px 0;font-size:13.5px;color:var(--ink2)}
footer{max-width:1100px;margin:30px auto 0;padding:24px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;line-height:1.55}footer p{max-width:100ch}
@media(max-width:720px){
  main{padding:22px 16px}h1{font-size:25px}.tag{display:none}header.site{padding:12px 16px;gap:12px}
  .stats div{flex:1 1 45%;border-right:0;border-bottom:1px solid var(--line)}.stats div:nth-last-child(-n+1){border-bottom:0}
  .filters .count{margin-left:0;flex-basis:100%}
  .tablewrap{border:0;overflow:visible;background:none}table{min-width:0}thead{display:none}
  table,tbody,tr,td{display:block;width:100%}
  tr{border:1px solid var(--line);border-radius:9px;margin:0 0 10px;padding:6px 0;background:var(--panel)}
  tr:last-child td{border-bottom:1px solid var(--line)}
  td{border:0;padding:6px 14px;display:flex;justify-content:space-between;gap:14px;align-items:baseline}
  td::before{content:attr(data-label);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em;flex:0 0 auto}
  td.name{display:block}td.name::before{display:none}.desc{max-width:none}
  td.ctr{text-align:right}
  td[data-label="Min RAM"],td[data-label="Activity"]{white-space:normal}
  td[data-label="Activity"]{flex-wrap:wrap;justify-content:flex-start;column-gap:10px}td[data-label="Activity"]::before{flex-basis:100%}
  .doc-table td{display:flex}
}`;

function ogCard(toolCount: number, altCount: number): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box;font-family:ui-sans-serif,system-ui,"Segoe UI",Roboto,sans-serif}
  body{width:1200px;height:630px;background:#0f1115;color:#e8eaed;padding:70px;display:flex;flex-direction:column;justify-content:center}
  .b{font-size:30px;color:#3ddc97;font-weight:700;letter-spacing:.5px;display:flex;align-items:center;gap:14px}
  h1{font-size:74px;line-height:1.05;margin:18px 0 14px;letter-spacing:-1px}h1 .g{color:#3ddc97}
  p{font-size:30px;color:#c7ccd6;max-width:980px;line-height:1.4}
  .row{display:flex;gap:14px;margin-top:40px}
  .pill{background:#171a21;border:1px solid #262b36;border-radius:10px;padding:14px 20px;font-size:24px;color:#c7ccd6}.pill b{color:#e8eaed}
  </style></head><body>
  <div class="b"><svg viewBox="0 0 64 64" width="44" height="44"><rect width="64" height="64" rx="14" fill="#171a21"/><path d="M17 33l10 11 20-24" fill="none" stroke="#3ddc97" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>SelfHostScore</div>
  <h1>Self-hostable, open-source<br>alternatives, <span class="g">verified</span></h1>
  <p>Ranked by a live GitHub Health Score, with deploy data checked against official documentation.</p>
  <div class="row"><div class="pill"><b>${toolCount}</b> categories</div><div class="pill"><b>${altCount}</b> alternatives</div><div class="pill">RAM, ARM64, one-click</div></div>
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
  await writeFile(join(OUT, "api", "index.html"), apiPage(data), "utf8");
  await writeFile(join(OUT, "llms.txt"), llmsTxt(data), "utf8");

  const awesome = awesomeMd(data);
  await writeFile(join(ROOT, "awesome.md"), awesome, "utf8"); // GitHub export (project root)
  await writeFile(join(ROOT, "data", "tools.json"), jsonFeed(data), "utf8"); // committed public dataset
  // README.md = docs/README-header.md + the awesome list body (from its first "## " heading on)
  const header = await readFile(join(ROOT, "docs", "README-header.md"), "utf8").catch(() => "");
  if (header) {
    const body = awesome.slice(Math.max(0, awesome.indexOf("\n## ")));
    await writeFile(
      join(ROOT, "README.md"),
      `${header.trimEnd()}\n\n_Data updated ${data.generatedAt.slice(0, 10)}. The tables below are generated: edit [data/seed.json](data/seed.json), not this file._\n${body.trimEnd()}\n`,
      "utf8",
    );
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

  const urls: string[] = [`${SITE_URL}/`, `${SITE_URL}/can-i-run/`, `${SITE_URL}/methodology/`, `${SITE_URL}/api/`, `${SITE_URL}/about/`, `${SITE_URL}/sponsor/`];

  const pages: [string, string][] = [
    ["can-i-run", matcherPage(data)],
    ["methodology", methodologyPage(data)],
    ["about", aboutPage(data)],
    ["sponsor", sponsorPage(data)],
  ];
  for (const [dir, html] of pages) {
    await mkdir(join(OUT, dir), { recursive: true });
    await writeFile(join(OUT, dir, "index.html"), html, "utf8");
  }

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
    .map((u) => `<url><loc>${u}</loc><lastmod>${data.generatedAt.slice(0, 10)}</lastmod></url>`)
    .join("\n")}\n</urlset>\n`;
  await writeFile(join(OUT, "sitemap.xml"), sitemap, "utf8");
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`, "utf8");

  await cp(join(ROOT, "public"), OUT, { recursive: true }).catch(() => {});

  console.log(`Built ${data.tools.length} tool pages + homepage + matcher + ${COLLECTIONS.length} collections + methodology/api/about/sponsor -> ${OUT}`);
  console.log(`Pages: ${urls.length}. Wrote api/tools.json, ${seenBadge.size} badges (api/badge/*), llms.txt, awesome.md, README.md, data/tools.json, app.js, favicon, og-card, sitemap, robots.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
