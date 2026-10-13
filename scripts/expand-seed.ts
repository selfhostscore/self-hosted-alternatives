// One-off: append new self-host tool categories to data/seed.json (skip existing slugs).
// Footprints here are DRAFT placeholders — the footprint-verify workflow overwrites them.
// Run: node scripts/expand-seed.ts
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Seed, SeedTool } from "../src/types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED_PATH = join(ROOT, "data", "seed.json");

const fp = (database: string) => ({ database, minRamMB: 0, arm64: true, deploy: ["Docker"], oneClick: [] });
const a = (name: string, slug: string, github: string, homepage: string, description: string, database: string) => ({
  name, slug, github, homepage, description, footprint: fp(database),
});

const NEW: SeedTool[] = [
  {
    name: "GitHub", slug: "github", category: "Git hosting / code collaboration", homepage: "https://github.com",
    blurb: "Code hosting, pull requests and CI. Self-hosted git keeps source on your own infra without per-seat pricing.",
    alternatives: [
      a("Gitea", "gitea", "go-gitea/gitea", "https://gitea.io", "Lightweight self-hosted Git service with PRs, issues and actions.", "PostgreSQL/MySQL/SQLite"),
      a("Gogs", "gogs", "gogs/gogs", "https://gogs.io", "Painless, low-footprint self-hosted Git service.", "SQLite/MySQL/PostgreSQL"),
      a("OneDev", "onedev", "theonedev/onedev", "https://onedev.io", "Git server with built-in CI/CD, kanban and code search.", "PostgreSQL/MySQL"),
    ],
  },
  {
    name: "CircleCI", slug: "circleci", category: "CI/CD", homepage: "https://circleci.com",
    blurb: "Continuous integration and delivery. Self-hosted runners cut per-minute pricing and keep pipelines private.",
    alternatives: [
      a("Woodpecker CI", "woodpecker", "woodpecker-ci/woodpecker", "https://woodpecker-ci.org", "Simple, container-native CI engine; a community fork of Drone.", "PostgreSQL/MySQL/SQLite"),
      a("Drone", "drone", "harness/drone", "https://www.drone.io", "Container-native CI/CD platform configured as code.", "SQLite/PostgreSQL/MySQL"),
      a("Concourse", "concourse", "concourse/concourse", "https://concourse-ci.org", "Pipeline-based CI with reproducible, isolated builds.", "PostgreSQL"),
    ],
  },
  {
    name: "Salesforce", slug: "salesforce", category: "CRM", homepage: "https://salesforce.com",
    blurb: "Customer relationship management. Self-hosted CRMs avoid steep per-user pricing and keep customer data in-house.",
    alternatives: [
      a("Twenty", "twenty", "twentyhq/twenty", "https://twenty.com", "Modern open-source CRM with a clean, customizable data model.", "PostgreSQL"),
      a("EspoCRM", "espocrm", "espocrm/espocrm", "https://www.espocrm.com", "Fast, flexible CRM that runs on cheap LAMP.", "MySQL/MariaDB"),
      a("SuiteCRM", "suitecrm", "salesagility/SuiteCRM", "https://suitecrm.com", "Full-featured enterprise CRM, a SugarCRM successor.", "MySQL/MariaDB"),
      a("Krayin", "krayin", "krayin/laravel-crm", "https://krayincrm.com", "Laravel-based open-source CRM for SMBs.", "MySQL"),
    ],
  },
  {
    name: "Doppler", slug: "doppler", category: "Secrets management", homepage: "https://www.doppler.com",
    blurb: "Centralized secrets/config management. Self-hosted vaults keep API keys and secrets under your control.",
    alternatives: [
      a("Infisical", "infisical", "Infisical/infisical", "https://infisical.com", "Open-source secrets manager with env sync and access controls.", "PostgreSQL"),
      a("OpenBao", "openbao", "openbao/openbao", "https://openbao.org", "Community fork of HashiCorp Vault for secrets and encryption.", "integrated/Consul"),
    ],
  },
  {
    name: "LaunchDarkly", slug: "launchdarkly", category: "Feature flags", homepage: "https://launchdarkly.com",
    blurb: "Feature flag management. Self-hosted flag services remove per-seat/MAU pricing and keep flag data private.",
    alternatives: [
      a("Unleash", "unleash", "Unleash/unleash", "https://www.getunleash.io", "Enterprise-ready feature flag platform with SDKs for every stack.", "PostgreSQL"),
      a("Flagsmith", "flagsmith", "Flagsmith/flagsmith", "https://flagsmith.com", "Open-source feature flags + remote config across platforms.", "PostgreSQL"),
      a("GrowthBook", "growthbook", "growthbook/growthbook", "https://www.growthbook.io", "Feature flags plus A/B testing on your own warehouse.", "MongoDB"),
    ],
  },
  {
    name: "Statuspage", slug: "statuspage", category: "Status page", homepage: "https://www.atlassian.com/software/statuspage",
    blurb: "Public status/incident pages. Self-hosted status pages run on your domain at no per-page cost.",
    alternatives: [
      a("Gatus", "gatus", "TwiN/gatus", "https://gatus.io", "Developer-oriented health dashboard + status page in one binary.", "SQLite/PostgreSQL"),
      a("Cachet", "cachet", "cachethq/cachet", "https://cachethq.io", "Beautiful open-source status page system.", "MySQL/PostgreSQL"),
      a("Statping-ng", "statping-ng", "statping-ng/statping-ng", "https://statping-ng.github.io", "Status page + uptime monitor with notifications.", "SQLite/MySQL/PostgreSQL"),
    ],
  },
  {
    name: "Google Photos", slug: "google-photos", category: "Photo storage / management", homepage: "https://photos.google.com",
    blurb: "Photo backup and library. Self-hosted photo apps keep memories on your own disks with AI search.",
    alternatives: [
      a("Immich", "immich", "immich-app/immich", "https://immich.app", "High-performance self-hosted photo/video backup with mobile apps.", "PostgreSQL"),
      a("PhotoPrism", "photoprism", "photoprism/photoprism", "https://www.photoprism.app", "AI-powered photo app for browsing and organizing your library.", "MariaDB/SQLite"),
      a("LibrePhotos", "librephotos", "LibrePhotos/librephotos", "https://librephotos.com", "Self-hosted photo management with face/object recognition.", "PostgreSQL"),
    ],
  },
  {
    name: "Evernote", slug: "evernote", category: "Note-taking", homepage: "https://evernote.com",
    blurb: "Personal note-taking. Self-hosted/open notes keep your knowledge private and sync-free of subscriptions.",
    alternatives: [
      a("Joplin", "joplin", "laurent22/joplin", "https://joplinapp.org", "Open-source notes + to-dos with end-to-end encrypted sync.", "SQLite"),
      a("Trilium Notes", "trilium", "TriliumNext/Notes", "https://github.com/TriliumNext/Notes", "Hierarchical personal knowledge base with a self-host server.", "SQLite"),
      a("Notesnook", "notesnook", "streetwriters/notesnook", "https://notesnook.com", "Privacy-first, end-to-end encrypted note app, self-hostable sync.", "PostgreSQL/MongoDB"),
    ],
  },
  {
    name: "Pocket", slug: "pocket", category: "Bookmarks / read-later", homepage: "https://getpocket.com",
    blurb: "Save links and articles for later. Self-hosted bookmark apps keep your reading list private and permanent.",
    alternatives: [
      a("Linkding", "linkding", "sissbruecker/linkding", "https://linkding.link", "Minimal, fast self-hosted bookmark manager.", "SQLite/PostgreSQL"),
      a("Karakeep", "karakeep", "karakeep-app/karakeep", "https://karakeep.app", "Bookmark-everything app with AI tagging (formerly Hoarder).", "SQLite"),
      a("Wallabag", "wallabag", "wallabag/wallabag", "https://wallabag.org", "Self-hosted read-it-later with clean article extraction.", "MySQL/PostgreSQL/SQLite"),
    ],
  },
  {
    name: "NextDNS", slug: "nextdns", category: "DNS / network ad-blocking", homepage: "https://nextdns.io",
    blurb: "DNS filtering and ad/tracker blocking. Self-hosted DNS keeps queries on your network and is free at any scale.",
    alternatives: [
      a("AdGuard Home", "adguard-home", "AdguardTeam/AdGuardHome", "https://adguard.com/adguard-home/overview.html", "Network-wide ad/tracker blocking DNS server with a clean UI.", "none (files)"),
      a("Pi-hole", "pi-hole", "pi-hole/pi-hole", "https://pi-hole.net", "The classic network-wide DNS sinkhole ad blocker.", "SQLite"),
      a("Technitium DNS", "technitium", "TechnitiumSoftware/DnsServer", "https://technitium.com/dns/", "Full authoritative + recursive DNS server with blocking.", "none (files)"),
    ],
  },
  {
    name: "Backblaze", slug: "backblaze", category: "Backup", homepage: "https://www.backblaze.com",
    blurb: "Cloud backup. Self-hosted backup tools let you back up to your own storage or any S3 cheaply.",
    alternatives: [
      a("Restic", "restic", "restic/restic", "https://restic.net", "Fast, secure, deduplicating backup CLI to many backends.", "none (repo files)"),
      a("Duplicati", "duplicati", "duplicati/duplicati", "https://www.duplicati.com", "Encrypted, scheduled backups to cloud/S3 with a web UI.", "SQLite"),
      a("Kopia", "kopia", "kopia/kopia", "https://kopia.io", "Cross-platform encrypted backup with snapshots and a UI.", "none (repo files)"),
    ],
  },
  {
    name: "QuickBooks", slug: "quickbooks", category: "Accounting / invoicing", homepage: "https://quickbooks.intuit.com",
    blurb: "Accounting and invoicing. Self-hosted finance apps keep books private and remove subscriptions.",
    alternatives: [
      a("Firefly III", "firefly-iii", "firefly-iii/firefly-iii", "https://www.firefly-iii.org", "Personal finance manager for budgets, accounts and reports.", "MySQL/PostgreSQL/SQLite"),
      a("Akaunting", "akaunting", "akaunting/akaunting", "https://akaunting.com", "Free, online accounting software for small businesses.", "MySQL/MariaDB"),
      a("Invoice Ninja", "invoice-ninja", "invoiceninja/invoiceninja", "https://www.invoiceninja.com", "Invoicing, payments and expenses for freelancers/SMBs.", "MySQL/MariaDB"),
    ],
  },
  {
    name: "SAP", slug: "sap", category: "ERP", homepage: "https://www.sap.com",
    blurb: "Enterprise resource planning. Open-source ERPs run your whole business without seven-figure licensing.",
    alternatives: [
      a("ERPNext", "erpnext", "frappe/erpnext", "https://erpnext.com", "Full open-source ERP: accounting, inventory, HR, manufacturing.", "MariaDB/PostgreSQL"),
      a("Odoo", "odoo", "odoo/odoo", "https://www.odoo.com", "Modular business suite: CRM, sales, inventory, accounting.", "PostgreSQL"),
      a("Dolibarr", "dolibarr", "Dolibarr/dolibarr", "https://www.dolibarr.org", "Lightweight ERP/CRM for SMBs on LAMP.", "MySQL/MariaDB/PostgreSQL"),
    ],
  },
  {
    name: "WordPress.com", slug: "wordpress", category: "CMS / blog", homepage: "https://wordpress.com",
    blurb: "Hosted CMS/blogging. Self-hosted CMS and headless options keep content and revenue fully yours.",
    alternatives: [
      a("Ghost", "ghost", "TryGhost/Ghost", "https://ghost.org", "Modern publishing + newsletter platform for creators.", "MySQL/SQLite"),
      a("Strapi", "strapi", "strapi/strapi", "https://strapi.io", "Leading open-source headless CMS with a customizable API.", "PostgreSQL/MySQL/SQLite"),
      a("Directus", "directus", "directus/directus", "https://directus.io", "Headless CMS + data platform over any SQL database.", "PostgreSQL/MySQL/SQLite"),
      a("Payload", "payload", "payloadcms/payload", "https://payloadcms.com", "TypeScript-native headless CMS and app framework.", "PostgreSQL/MongoDB"),
    ],
  },
];

const seed = JSON.parse(await readFile(SEED_PATH, "utf8")) as Seed;
const existing = new Set(seed.tools.map((t) => t.slug));
let added = 0;
for (const t of NEW) {
  if (existing.has(t.slug)) {
    console.log(`skip (exists): ${t.slug}`);
    continue;
  }
  seed.tools.push(t);
  added++;
}
seed.meta.version = `manual seed v0.3 (${seed.tools.length} tools)`;
await writeFile(SEED_PATH, JSON.stringify(seed, null, 2) + "\n", "utf8");
console.log(`Added ${added} tools. Seed now has ${seed.tools.length} tools, ${seed.tools.reduce((n, t) => n + t.alternatives.length, 0)} alternatives.`);
