# Self-hosted alternatives, ranked by a live Health Score

[![Data updated](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fselfhostscore.com%2Fapi%2Ftools.json&query=%24.updated&label=data%20updated&color=4c1)](https://selfhostscore.com/api/tools.json)
[![Refresh](https://github.com/selfhostscore/self-hosted-alternatives/actions/workflows/refresh.yml/badge.svg)](https://github.com/selfhostscore/self-hosted-alternatives/actions/workflows/refresh.yml)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-blue)](DATA-LICENSE.md)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)

**Open-source, self-hostable alternatives to popular SaaS** (Notion, Airtable, Slack, Zapier, Auth0, Datadog and more), each with:

- **Self-Host Health Score (0-100)**, refreshed daily from the GitHub API: commit activity (35) + release recency (25) + stars (25) + forks (15). Archived or abandoned repos score 0. Transparent methodology: [selfhostscore.com/#methodology](https://selfhostscore.com/#methodology).
- **Deploy footprint, verified against official docs**: minimum RAM, database, ARM64 / Raspberry Pi support, one-click deploy (Coolify, CapRover, Railway). This is the column other directories do not have.

Interactive site: <https://selfhostscore.com> (sort, filter by Raspberry Pi, one-click and RAM, and [find apps that fit your server](https://selfhostscore.com/can-i-run/)).
Dataset and API: [`/api/tools.json`](https://selfhostscore.com/api/tools.json), documented at [selfhostscore.com/api](https://selfhostscore.com/api/) and committed here as [`data/tools.json`](data/tools.json). Exact score formula and footprint verification: [methodology](https://selfhostscore.com/methodology/). For LLMs: [`llms.txt`](https://selfhostscore.com/llms.txt).

## Maintainers: add the live badge to your README

Every listed project gets a free badge that updates daily:

```markdown
[![Self-Host Score](https://selfhostscore.com/api/badge/<slug>.svg)](https://selfhostscore.com/self-host/<slug>/)
```

Open your project's page on the site (`https://selfhostscore.com/self-host/<slug>/`) and expand **"Add the live Self-Host Score badge"** for a ready-to-paste snippet. Shields.io users: `https://img.shields.io/endpoint?url=https://selfhostscore.com/api/badge/<slug>.json`.

## Contributing

- **Add or fix a tool:** edit [`data/seed.json`](data/seed.json) and open a PR. Every alternative needs a GitHub repo and a footprint with a source (official docs link). Self-hostable only.
- **Scores and tables are generated.** Do not edit `README.md` or `awesome.md` by hand; run `node scripts/enrich.ts && node scripts/build-site.ts` (Node 23.6+, zero dependencies).
- How the engine works: [`docs/ENGINE.md`](docs/ENGINE.md).

## License

Data (`data/seed.json`, `data/tools.json`, the tables in this README and `awesome.md`): [CC BY 4.0](DATA-LICENSE.md), free to use, remix and republish with a link to <https://selfhostscore.com>. Code: [MIT](LICENSE).
