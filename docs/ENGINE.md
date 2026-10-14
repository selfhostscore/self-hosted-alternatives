# How the engine works

SelfHostScore is a zero-dependency static site generator written in TypeScript and run directly by Node (native type stripping, Node 23.6 or newer). There is no framework, no build tool and no database. One curated JSON file goes in, a finished site and a public dataset come out.

## Pipeline

```
data/seed.json  ->  scripts/enrich.ts  ->  data/enriched.json  ->  scripts/build-site.ts  ->  dist/
   (curated)         (GitHub API,            (generated,            (pages, feed, badges,      (deployed to
                      Health Score)           ignored by git)        llms.txt, README)          Cloudflare)
```

1. **Seed.** `data/seed.json` holds every category ("tool") and its self-hostable alternatives: name, slug, GitHub `owner/repo`, homepage, a one-line description and the deploy footprint (database, minimum RAM in MB, ARM64 support, deploy methods, one-click platforms) with a confidence level and the documentation URLs it was read from. The schema is in `src/types.ts`.
2. **Enrich.** `scripts/enrich.ts` fetches each repository and its latest release from the GitHub REST API, computes the Self-Host Health Score with `src/healthScore.ts` and writes `data/enriched.json`. Requests retry with backoff on network errors, 5xx responses and secondary rate limits. With a token the script gets 5,000 requests per hour and release data; without one, 60 per hour and no releases.
3. **Build.** `scripts/build-site.ts` renders every page from the enriched data: one page per category with a sortable, filterable table; the server matcher; four collections; methodology, API, about and sponsor pages; `api/tools.json`; `llms.txt`; per-project badges under `api/badge/`; `sitemap.xml` and `robots.txt`. It also writes `awesome.md`, assembles `README.md` from `docs/README-header.md` plus the generated tables, and copies the feed to `data/tools.json` so the dataset is versioned in git.
4. **Deploy.** `dist/` is uploaded as static assets of a Cloudflare Worker named `selfhostscore` with `npx wrangler deploy` (configuration in `wrangler.jsonc`).

## Self-Host Health Score

A 0 to 100 total of four components, each computed from one repository fetch plus the latest release. Component values are rounded before summing.

| Component | Max | Input | Rule |
|---|---|---|---|
| Activity | 35 | Days since the last push | Full points at 30 days or less, linear decay to 0 at 365 days |
| Releases | 25 | Days since the latest release | Full points at 90 days or less, linear decay to 0 at 540 days; projects without releases get a fixed 5 points |
| Maturity | 25 | Stars | log10(stars + 1) / log10(50,001), times 25 |
| Adoption | 15 | Forks | log10(forks + 1) / log10(10,001), times 15 |

Archived repositories and repositories that cannot be fetched score 0. Bands: 80 and above Thriving, 60 Healthy, 40 Steady, 20 At risk, below 20 Dormant. The public explanation lives at <https://selfhostscore.com/methodology/>.

## Deploy footprint and confidence

Footprint values are curated by hand from official documentation, Docker Hub or GitHub Container Registry listings and official platform templates. Each alternative records `footprintConfidence`:

- `high`: the documentation states the value directly.
- `medium`: derived from official material (a docker-compose file, image tags), no single stated number.
- `low`: an estimate based on community reports.

When confidence is not `high`, the site marks the RAM figure as an estimate. `scripts/merge-footprint.ts` merges the output of a verification pass back into the seed and records sources and confidence; `scripts/check-repos.ts` validates that every GitHub slug resolves without spending API quota. `data/deploy-links.json` maps each alternative to verified one-click deploy pages; affiliate parameters are added at build time from `data/offers.json`.

## Run it locally

```
node scripts/check-repos.ts     # validate github slugs (no API quota)
node scripts/enrich.ts          # GITHUB_TOKEN env var or a gitignored .github-token file
node scripts/build-site.ts      # writes dist/, README.md, awesome.md, data/tools.json
node scripts/serve.ts           # preview at http://localhost:4321
```

The package.json scripts `enrich`, `check`, `build` and `serve` map to the same commands. `node scripts/enrich.ts --summary` prints the ranking without writing. `--slugs a,b` restricts a run to given categories and `--append` merges that subset into the existing enriched file.

## Daily refresh (GitHub Actions)

`.github/workflows/refresh.yml` runs every day at 05:23 UTC, on every push to `main` and on manual dispatch:

1. Enrich with the workflow's built-in `GITHUB_TOKEN` (1,000 requests per hour, enough for the whole seed).
2. Build.
3. Commit `README.md`, `awesome.md` and `data/tools.json` if anything changed, as `selfhostscore-bot`.
4. Deploy to Cloudflare when the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets are present; otherwise skip with a warning.
5. Re-enable the schedule through the API. GitHub disables scheduled workflows in public repositories after 60 days without pushes; the daily data commit plus this step keep it alive. The step is inline on purpose: the third-party keepalive action this repository first used was later blocked by GitHub.

## Weekly deploy-link check (GitHub Actions)

`.github/workflows/check-links.yml` runs every Monday at 04:41 UTC and on manual dispatch. It runs `node scripts/check-deploy-links.ts --prune`, which fetches every one-click deploy page in `data/deploy-links.json` and retries each failure twice (after 5 and 20 seconds).

- **All OK:** an open `dead-links` issue, if any, is closed with a comment.
- **Dead links:** they are removed from `data/deploy-links.json` (with the reason recorded under `_removed`), the change is committed, the refresh workflow is started to redeploy, and an issue labelled `dead-links` lists what was removed and mentions the workflow owner, which sends an email.
- **More than 20% failing at once:** treated as a platform outage or a block of the checker. Nothing is removed and the run ends with a warning.

To test the alert path without touching real data, run the workflow manually with the `canary` input: it adds one fake dead link, opens the issue, and removes nothing.

## Repository layout

```
data/seed.json          curated input (edit this to add or fix a project)
data/offers.json        managed-hosting partners shown as sponsored links
data/tools.json         generated public dataset, committed daily
scripts/                enrich, build, serve, check-repos, merge-footprint, expand-seed
src/types.ts            data model
src/healthScore.ts      score formula
docs/README-header.md   hand-written top of the public README
docs/ENGINE.md          this file
public/                 static files copied into dist (og.png)
.github/workflows/      daily refresh and deploy, weekly deploy-link check
wrangler.jsonc          Cloudflare Worker configuration
```

`.gitignore` is a whitelist: only the files above are tracked. Generated output (`dist/`, `data/enriched.json`) and local secrets never enter the repository.

## Contributing a project

Edit `data/seed.json`. An alternative needs `name`, `slug`, `github`, `description` and a complete `footprint` (`database`, `minRamMB`, `arm64`, `deploy`, `oneClick`), plus `footprintConfidence` and `footprintSources` pointing at the official documentation that supports the values. Only self-hostable open-source projects with a public GitHub repository are accepted. Run `node scripts/check-repos.ts` before opening a pull request; the daily job recomputes scores after a merge.
