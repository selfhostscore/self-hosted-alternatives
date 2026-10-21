# Self-hosted alternatives, ranked by a live Health Score

[![Data updated](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fselfhostscore.com%2Fapi%2Ftools.json&query=%24.updated&label=data%20updated&color=4c1)](https://selfhostscore.com/api/tools.json)
[![Refresh](https://github.com/selfhostscore/self-hosted-alternatives/actions/workflows/refresh.yml/badge.svg)](https://github.com/selfhostscore/self-hosted-alternatives/actions/workflows/refresh.yml)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-blue)](DATA-LICENSE.md)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue)](LICENSE)

**Open-source, self-hostable alternatives to popular SaaS** (Notion, Airtable, Slack, Zapier, Auth0, Datadog and more), each with:

- **Self-Host Health Score (0-100)**, refreshed daily from the GitHub API: commit activity (35) + release recency (25) + stars (25) + forks (15). Archived or abandoned repos score 0. Transparent methodology: [selfhostscore.com/#methodology](https://selfhostscore.com/#methodology).
- **Deploy footprint with sources**: minimum RAM, database, ARM64 / Raspberry Pi support, one-click deploy (Coolify, CapRover, Railway), read from official docs where they state it, with a confidence level per app (high, medium, low). This is the column other directories do not have.

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

_Data updated 2026-10-21. The tables below are generated: edit [data/seed.json](data/seed.json), not this file._

## Airtable alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [NocoDB](https://github.com/nocodb/nocodb) | 99 | 65k | PostgreSQL | about 2048 MB | Yes | Yes |
| [Teable](https://github.com/teableio/teable) | 95 | 22k | PostgreSQL | 4096 MB | Yes | Yes |
| [Grist](https://github.com/gristlabs/grist-core) | 93 | 12k | none / embedded | 200 MB | Yes | Yes |
| [Baserow](https://github.com/baserow/baserow) | 91 | 6.2k | PostgreSQL | 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/airtable/

## Notion alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | 99 | 78k | PostgreSQL | about 2048 MB | Yes | Yes |
| [AFFiNE](https://github.com/toeverything/AFFiNE) | 99 | 74k | PostgreSQL | 2048 MB | Yes | Yes |
| [Outline](https://github.com/outline/outline) | 98 | 41k | PostgreSQL | 512 MB | Yes | Yes |
| [Docmost](https://github.com/docmost/docmost) | 95 | 22k | PostgreSQL | about 1024 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/notion/

## Retool alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Appsmith](https://github.com/appsmithorg/appsmith) | 99 | 41k | MongoDB | 8192 MB | Yes | Yes |
| [ToolJet](https://github.com/ToolJet/ToolJet) | 99 | 41k | PostgreSQL | 4096 MB | No | Yes |
| [Budibase](https://github.com/Budibase/budibase) | 97 | 28k | CouchDB | 4096 MB | Yes | Yes |
| [NocoBase](https://github.com/nocobase/nocobase) | 96 | 25k | PostgreSQL | 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/retool/

## Zapier alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [n8n](https://github.com/n8n-io/n8n) | 100 | 208k | SQLite | 2048 MB | Yes | Yes |
| [Activepieces](https://github.com/activepieces/activepieces) | 97 | 25k | PostgreSQL | 4096 MB | Yes | Yes |
| [Automatisch](https://github.com/automatisch/automatisch) | 51 | 14k | PostgreSQL | about 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/zapier/

## Calendly alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Cal.diy](https://github.com/calcom/cal.diy) | 92 | 49k | PostgreSQL | about 2048 MB | Yes | Yes |
| [Easy!Appointments](https://github.com/alextselegidis/easyappointments) | 91 | 4.5k | MySQL | about 512 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/calendly/

## Trello alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [WeKan](https://github.com/wekan/wekan) | 96 | 21k | MongoDB | 1024 MB | Yes | Yes |
| [Planka](https://github.com/plankanban/planka) | 94 | 13k | PostgreSQL | 512 MB | Yes | Yes |
| [Kanboard](https://github.com/kanboard/kanboard) | 93 | 9.9k | PostgreSQL | 256 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/trello/

## Slack alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Rocket.Chat](https://github.com/RocketChat/Rocket.Chat) | 100 | 46k | MongoDB | 4096 MB | Yes | Yes |
| [Mattermost](https://github.com/mattermost/mattermost) | 99 | 39k | PostgreSQL | 2048 MB | No | Yes |
| [Zulip](https://github.com/zulip/zulip) | 98 | 26k | PostgreSQL | 2048 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/slack/

## Confluence alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Outline](https://github.com/outline/outline) | 98 | 41k | PostgreSQL | 512 MB | Yes | Yes |
| [Wiki.js](https://github.com/requarks/wiki) | 97 | 29k | PostgreSQL | 512 MB | Yes | Yes |
| [BookStack](https://github.com/BookStackApp/BookStack) | 96 | 19k | MySQL >= 8 | about 1024 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/confluence/

## Postman alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Hoppscotch](https://github.com/hoppscotch/hoppscotch) | 99 | 81k | PostgreSQL | 2048 MB | No | Yes |
| [Bruno](https://github.com/usebruno/bruno) | 98 | 48k | none / embedded | 512 MB | Yes | No |

Full details, sources and badges: https://selfhostscore.com/alternatives/postman/

## Typeform alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Formbricks](https://github.com/formbricks/formbricks) | 95 | 13k | PostgreSQL | 2048 MB | Yes | Yes |
| [HeyForm](https://github.com/heyform/heyform) | 92 | 9.0k | MongoDB | about 1024 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/typeform/

## Heroku alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Coolify](https://github.com/coollabsio/coolify) | 99 | 63k | PostgreSQL | 2048 MB | Yes | Yes |
| [Dokploy](https://github.com/dokploy/dokploy) | 97 | 38k | PostgreSQL | 2048 MB | Yes | No |
| [Dokku](https://github.com/dokku/dokku) | 96 | 32k | none / embedded | 1024 MB | Yes | Yes |
| [CapRover](https://github.com/caprover/caprover) | 93 | 15k | none / embedded | 512 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/heroku/

## Auth0 alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Keycloak](https://github.com/keycloak/keycloak) | 99 | 37k | PostgreSQL | 1250 MB | Yes | Yes |
| [Authentik](https://github.com/goauthentik/authentik) | 95 | 26k | PostgreSQL | 2048 MB | Yes | Yes |
| [Zitadel](https://github.com/zitadel/zitadel) | 94 | 15k | PostgreSQL | 512 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/auth0/

## Datadog alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Uptime Kuma](https://github.com/louislam/uptime-kuma) | 100 | 93k | SQLite | about 256 MB | Yes | Yes |
| [SigNoz](https://github.com/SigNoz/signoz) | 97 | 32k | ClickHouse | 4096 MB | No | Yes |
| [OpenObserve](https://github.com/openobserve/openobserve) | 94 | 22k | none / embedded | about 512 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/datadog/

## Zendesk alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Chatwoot](https://github.com/chatwoot/chatwoot) | 99 | 38k | PostgreSQL | 4096 MB | No | Yes |
| [FreeScout](https://github.com/freescout-help-desk/freescout) | 90 | 4.6k | MySQL/MariaDB | about 1024 MB | Yes | Yes |
| [Zammad](https://github.com/zammad/zammad) | 71 | 6.0k | PostgreSQL | 4096 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/zendesk/

## Google Analytics alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Umami](https://github.com/umami-software/umami) | 99 | 40k | PostgreSQL | about 512 MB | Yes | Yes |
| [PostHog](https://github.com/PostHog/posthog) | 98 | 40k | PostgreSQL + ClickHouse | 4096 MB | Yes | Yes |
| [Plausible](https://github.com/plausible/analytics) | 92 | 30k | PostgreSQL + ClickHouse | 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/google-analytics/

## DocuSign alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Documenso](https://github.com/documenso/documenso) | 95 | 15k | PostgreSQL | 1024 MB | Yes | Yes |
| [Docuseal](https://github.com/docusealco/docuseal) | 95 | 19k | PostgreSQL | 1024 MB | Yes | Yes |
| [OpenSign](https://github.com/OpenSignLabs/OpenSign) | 92 | 7.1k | MongoDB | about 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/docusign/

## 1Password alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Vaultwarden](https://github.com/dani-garcia/vaultwarden) | 98 | 69k | SQLite | 512 MB | Yes | Yes |
| [Passbolt](https://github.com/passbolt/passbolt_api) | 90 | 6.2k | MariaDB/MySQL | 2048 MB | Yes | Yes |
| [Padloc](https://github.com/padloc/padloc) | 62 | 2.9k | LevelDB | about 512 MB | No | No |

Full details, sources and badges: https://selfhostscore.com/alternatives/1password/

## Loom alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Cap](https://github.com/CapSoftware/Cap) | 95 | 23k | MySQL | about 1024 MB | Yes | Yes |
| [Screenity](https://github.com/alyssaxuu/screenity) | 95 | 19k | none / embedded | n/a | Yes | No |

Full details, sources and badges: https://selfhostscore.com/alternatives/loom/

## Mailchimp alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Listmonk](https://github.com/knadh/listmonk) | 96 | 24k | PostgreSQL | 512 MB | Yes | Yes |
| [Mautic](https://github.com/mautic/mautic) | 94 | 11k | MySQL/MariaDB | about 2048 MB | Yes | Yes |
| [phpList](https://github.com/phpList/phplist3) | 85 | 878 | MySQL/MariaDB | about 512 MB | No | No |

Full details, sources and badges: https://selfhostscore.com/alternatives/mailchimp/

## Intercom alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Chatwoot](https://github.com/chatwoot/chatwoot) | 99 | 38k | PostgreSQL | 4096 MB | No | Yes |
| [Chaskiq](https://github.com/chaskiq/chaskiq) | 55 | 3.6k | PostgreSQL | about 2048 MB | No | Yes |
| [Papercups](https://github.com/papercups-io/papercups) | 30 | 6.1k | PostgreSQL | about 1024 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/intercom/

## Jira alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Plane](https://github.com/makeplane/plane) | 99 | 61k | PostgreSQL | 4096 MB | Yes | Yes |
| [OpenProject](https://github.com/opf/openproject) | 95 | 17k | PostgreSQL | 4096 MB | Yes | Yes |
| [Redmine](https://github.com/redmine/redmine) | 73 | 6.1k | PostgreSQL | about 1024 MB | Yes | Yes |
| [Taiga](https://github.com/taigaio/taiga) | 27 | 576 | PostgreSQL | about 1024 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/jira/

## Dropbox alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Nextcloud](https://github.com/nextcloud/server) | 98 | 37k | MariaDB/MySQL | 128 MB | Yes | Yes |
| [ownCloud](https://github.com/owncloud/core) | 93 | 8.8k | MariaDB | 128 MB | Yes | Yes |
| [Seafile](https://github.com/haiwen/seafile) | 69 | 15k | MySQL/MariaDB | 1024 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/dropbox/

## Looker alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Metabase](https://github.com/metabase/metabase) | 99 | 50k | PostgreSQL | 1024 MB | No | Yes |
| [Redash](https://github.com/getredash/redash) | 98 | 29k | PostgreSQL | 4096 MB | No | Yes |
| [Apache Superset](https://github.com/apache/superset) | 96 | 75k | PostgreSQL | about 4096 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/looker/

## Firebase alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Supabase](https://github.com/supabase/supabase) | 100 | 113k | PostgreSQL | 4096 MB | Yes | Yes |
| [Appwrite](https://github.com/appwrite/appwrite) | 99 | 58k | MongoDB | 4096 MB | Yes | Yes |
| [PocketBase](https://github.com/pocketbase/pocketbase) | 98 | 62k | SQLite | about 512 MB | Yes | Yes |
| [Nhost](https://github.com/nhost/nhost) | 92 | 9.4k | PostgreSQL | about 4096 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/firebase/

## Algolia alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Meilisearch](https://github.com/meilisearch/meilisearch) | 98 | 60k | none / embedded | about 512 MB | Yes | Yes |
| [Typesense](https://github.com/typesense/typesense) | 90 | 27k | none / embedded | about 256 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/algolia/

## Bitly alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [YOURLS](https://github.com/YOURLS/YOURLS) | 94 | 12k | MySQL/MariaDB | about 256 MB | Yes | Yes |
| [Kutt](https://github.com/thedevs-network/kutt) | 93 | 11k | SQLite | about 512 MB | Yes | Yes |
| [Shlink](https://github.com/shlinkio/shlink) | 90 | 5.4k | MySQL/MariaDB | about 512 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/bitly/

## Zoom alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Jitsi Meet](https://github.com/jitsi/jitsi-meet) | 99 | 30k | none / embedded | 2048 MB | Yes | Yes |
| [BigBlueButton](https://github.com/bigbluebutton/bigbluebutton) | 95 | 9.2k | PostgreSQL | 16384 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/zoom/

## GitHub alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Gitea](https://github.com/go-gitea/gitea) | 99 | 59k | SQLite | 1024 MB | Yes | Yes |
| [Gogs](https://github.com/gogs/gogs) | 96 | 48k | SQLite3 | 512 MB | Yes | No |
| [OneDev](https://github.com/theonedev/onedev) | 93 | 15k | none / embedded | 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/github/

## CircleCI alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Woodpecker CI](https://github.com/woodpecker-ci/woodpecker) | 92 | 8.0k | SQLite | 200 MB | Yes | Yes |
| [Drone](https://github.com/harness/drone) | 92 | 39k | PostgreSQL | 1024 MB | Yes | No |
| [Concourse](https://github.com/concourse/concourse) | 92 | 7.9k | PostgreSQL | about 2048 MB | Yes | No |

Full details, sources and badges: https://selfhostscore.com/alternatives/circleci/

## Salesforce alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Twenty](https://github.com/twentyhq/twenty) | 100 | 59k | PostgreSQL | 2048 MB | Yes | Yes |
| [Krayin](https://github.com/krayin/laravel-crm) | 95 | 24k | MySQL | 4096 MB | No | Yes |
| [SuiteCRM](https://github.com/salesagility/SuiteCRM) | 93 | 5.8k | MySQL/MariaDB | about 2048 MB | No | Yes |
| [EspoCRM](https://github.com/espocrm/espocrm) | 90 | 3.5k | MySQL/MariaDB | about 512 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/salesforce/

## Doppler alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Infisical](https://github.com/Infisical/infisical) | 97 | 30k | PostgreSQL | 4096 MB | Yes | Yes |
| [OpenBao](https://github.com/openbao/openbao) | 92 | 8.6k | none / embedded | about 256 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/doppler/

## LaunchDarkly alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Unleash](https://github.com/Unleash/unleash) | 93 | 14k | PostgreSQL | about 512 MB | Yes | Yes |
| [GrowthBook](https://github.com/growthbook/growthbook) | 92 | 8.5k | MongoDB | 2048 MB | Yes | Yes |
| [Flagsmith](https://github.com/Flagsmith/flagsmith) | 90 | 6.6k | PostgreSQL | 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/launchdarkly/

## Statuspage alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Gatus](https://github.com/TwiN/gatus) | 93 | 12k | SQLite | 64 MB | Yes | Yes |
| [Cachet](https://github.com/cachethq/cachet) | 69 | 15k | PostgreSQL | about 1024 MB | No | Yes |
| [Statping-ng](https://github.com/statping-ng/statping-ng) | 28 | 2.0k | SQLite | 64 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/statuspage/

## Google Photos alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Immich](https://github.com/immich-app/immich) | 99 | 117k | PostgreSQL | 6144 MB | Yes | Yes |
| [PhotoPrism](https://github.com/photoprism/photoprism) | 98 | 40k | MariaDB | 4096 MB | Yes | Yes |
| [LibrePhotos](https://github.com/LibrePhotos/librephotos) | 91 | 8.1k | PostgreSQL | about 4096 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/google-photos/

## Evernote alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Joplin](https://github.com/laurent22/joplin) | 99 | 57k | PostgreSQL | about 512 MB | Yes | Yes |
| [Trilium Notes](https://github.com/TriliumNext/Trilium) | 97 | 38k | SQLite | about 256 MB | Yes | Yes |
| [Notesnook](https://github.com/streetwriters/notesnook) | 93 | 15k | MongoDB | about 512 MB | Yes | No |

Full details, sources and badges: https://selfhostscore.com/alternatives/evernote/

## Pocket alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Karakeep](https://github.com/karakeep-app/karakeep) | 96 | 30k | SQLite | about 2048 MB | Yes | Yes |
| [Linkding](https://github.com/sissbruecker/linkding) | 93 | 11k | SQLite | about 256 MB | Yes | Yes |
| [Wallabag](https://github.com/wallabag/wallabag) | 77 | 13k | SQLite | about 512 MB | No | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/pocket/

## NextDNS alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Pi-hole](https://github.com/pi-hole/pi-hole) | 98 | 61k | none / embedded | 512 MB | Yes | No |
| [AdGuard Home](https://github.com/AdguardTeam/AdGuardHome) | 97 | 38k | none / embedded | about 256 MB | Yes | No |
| [Technitium DNS](https://github.com/TechnitiumSoftware/DnsServer) | 92 | 10k | none / embedded | about 512 MB | Yes | No |

Full details, sources and badges: https://selfhostscore.com/alternatives/nextdns/

## Backblaze alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Restic](https://github.com/restic/restic) | 95 | 37k | none / embedded | about 1024 MB | Yes | No |
| [Duplicati](https://github.com/duplicati/duplicati) | 93 | 15k | SQLite | about 256 MB | Yes | Yes |
| [Kopia](https://github.com/kopia/kopia) | 91 | 14k | none / embedded | about 256 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/backblaze/

## QuickBooks alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Firefly III](https://github.com/firefly-iii/firefly-iii) | 96 | 25k | MySQL/MariaDB | about 512 MB | Yes | Yes |
| [Akaunting](https://github.com/akaunting/akaunting) | 94 | 10k | MySQL/MariaDB | about 1024 MB | Yes | Yes |
| [Invoice Ninja](https://github.com/invoiceninja/invoiceninja) | 94 | 10k | MySQL/MariaDB | about 1024 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/quickbooks/

## SAP alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [ERPNext](https://github.com/frappe/erpnext) | 100 | 40k | MariaDB | about 4096 MB | Yes | Yes |
| [Dolibarr](https://github.com/Dolibarr/dolibarr) | 94 | 7.8k | MariaDB/MySQL | about 512 MB | Yes | Yes |
| [Odoo](https://github.com/odoo/odoo) | 80 | 55k | PostgreSQL | about 2048 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/sap/

## WordPress.com alternatives

| Alternative | Health | Stars | Database | Min RAM | ARM64 / Pi | One-click |
|---|---|---|---|---|---|---|
| [Ghost](https://github.com/TryGhost/Ghost) | 100 | 56k | MySQL 8 | 1024 MB | Yes | Yes |
| [Strapi](https://github.com/strapi/strapi) | 100 | 73k | PostgreSQL | 2048 MB | No | Yes |
| [Payload](https://github.com/payloadcms/payload) | 99 | 45k | MongoDB | about 512 MB | Yes | Yes |
| [Directus](https://github.com/directus/directus) | 98 | 39k | PostgreSQL | 512 MB | Yes | Yes |

Full details, sources and badges: https://selfhostscore.com/alternatives/wordpress/
