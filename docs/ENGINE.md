# Self-Hostable FOSS Alternatives Directory

> Working name — TBD. An **autonomous, data-moat content engine** (Path A: the quiet compounding asset).
> One page per proprietary tool → its self-hostable open-source alternatives, enriched **live** from the
> GitHub API and ranked by a transparent **Self-Host Health Score**.

## The wedge (why this can win in 2026)

The "alternatives to X" SERP is crowded (AlternativeTo, OpenAlternative, selfh.st). We do **not** fight them
on head terms. The differentiators:

1. **Self-hostable only** — every alternative must be actually deployable (Docker/compose/Helm/one-click).
2. **Deploy footprint column** — `database`, `minRamMB`, `arm64` (Raspberry-Pi), `oneClick` (Coolify/CapRover/Railway).
   This is the data incumbents **don't compute** and AI Overviews **can't fabricate** → AIO-resistant.
3. **Self-Host Health Score** — a published, transparent 0–100 composite from live GitHub data → freshness moat.
4. **Narrow vertical** — start with **dev/SMB internal tooling** (strong r/selfhosted intent, weaker incumbent depth).

Validated by an A/B/C niche workflow: this archetype scored highest for an autonomous solo engine; proof point
is OpenAlternative (~$80k/yr solo). Real money is **sell-side featured listings + sponsors**, NOT hosting affiliate.

## Architecture (autonomous, static, zero-dep pipeline)

```
data/seed.json        Hand-curated moat: proprietary → self-hostable FOSS mappings + deploy footprint
   │
scripts/enrich.ts     GitHub REST enrichment (stars/forks/license/last-commit/release) + Health Score
   │                  → data/enriched.json   (regenerated daily by cron)
   │
[Week 2] src/         Astro/Next static-site generator: 1 page per tool + per-alt detail + cluster guides
   │                  schema.org, FAQ, internal linking, per-page synthesis layer (LLM, grounded in the data)
   │
[Week 2] deploy       Vercel/Netlify + sitemap ping; GitHub Actions cron re-runs enrich + rebuild nightly
```

Pipeline is **zero-dependency** — Node ≥ 23.6 runs the `.ts` files natively (type-stripping), no build step.

## Status

| Phase | State |
|---|---|
| **Week 1 — moat + pipeline** | ✅ Done. **41 tools, 124 alternatives** (seed v0.3), all repo slugs validated; enricher runs end-to-end with token (real Health Scores). |
| **Week 2 — static site + synthesis layer** | ✅ Done. Zero-dep generator (`build-site.ts`) → **42 pages (home + 41 verified tools)**, data-grounded synthesis, schema.org (ItemList + FAQPage), sitemap/robots, affiliate layer (`offers.json`), preview server (`serve.ts`). |
| Week 3 — deploy + Search Console | ⬜ Next |
| Week 4 — depth pass + value-first r/selfhosted launch | ⬜ |
| Week 5–6 — indexing, expand wedge, sell-side slot | ⬜ |
| Week 7–8 — Ezoic/display, seed vendor listings | ⬜ |

## Run

```bash
node scripts/enrich.ts            # enriches seed → data/enriched.json + summary
node scripts/enrich.ts --summary  # summary only, no write
node scripts/check-repos.ts       # validate all seed slugs via github.com (no API quota)
```

> 79 alternatives > the anonymous 60/h API limit, so a **full** enrich now needs a `GITHUB_TOKEN`
> (also required for the nightly cron). `check-repos.ts` validates slugs without touching API quota.

For the **full Health Score range** and release data, set a token (5,000 req/h vs 60/h, + latest-release fetch):

```powershell
$env:GITHUB_TOKEN="ghp_xxx"; node scripts/enrich.ts
```

A read-only classic PAT with **no scopes** (public data) is enough. Do **not** commit it (`.gitignore` covers `.env`).

## Self-Host Health Score — methodology (intentionally public)

Transparency IS the moat (aggregation/curation, not a secret). 0–100 composite, computed in
[`src/healthScore.ts`](src/healthScore.ts) from a single repo fetch + latest release:

| Component | Max | Signal |
|---|---|---|
| **Activity** | 35 | last commit/push recency (full ≤30d, 0 at ≥365d) |
| **Releases** | 25 | latest release recency (full ≤90d, 0 at ≥540d; 0.2 floor if no releases) |
| **Maturity** | 25 | stars, log-scaled (≈full at 50k) |
| **Adoption** | 15 | forks, log-scaled (≈full at 10k) |

Archived/missing repos → 0. Inspired by OpenSSF Criticality Score + CHAOSS. Tune weights in `healthScore.ts`.

## ⚠️ Before publishing — verify the footprint

`data/seed.json` `footprintStatus` is **DRAFT-UNVERIFIED**. The `minRamMB / database / arm64 / oneClick`
values are best-effort and MUST be checked against each project's official docs before a page goes live —
accuracy of the deploy-footprint column is the differentiator; wrong numbers kill trust. This curation is the
real (non-autonomous) human work; the GitHub enrichment + scoring is fully automated.

## Layout

```
data/seed.json          curated input (the moat)
data/enriched.json      generated (gitignored)
scripts/enrich.ts       GitHub enricher + scorer
src/types.ts            shared types
src/healthScore.ts      transparent scoring
```
