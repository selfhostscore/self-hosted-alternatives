// Shared types for the self-hostable FOSS alternatives directory.
// Erasable-syntax only (Node native TS type-stripping): interfaces + type aliases.

/**
 * Deploy footprint — the differentiator incumbents (AlternativeTo / OpenAlternative)
 * do NOT compute and AI Overviews cannot fabricate. Curated by hand; verify before publish.
 */
export interface Footprint {
  /** Primary datastore, e.g. "PostgreSQL", "MySQL", "SQLite", "MongoDB", "none". */
  database: string;
  /** Rough minimum RAM to run a small instance, in MB. */
  minRamMB: number;
  /** ARM64 / Raspberry Pi support (official multi-arch image or known-good). */
  arm64: boolean;
  /** Deploy methods, e.g. ["Docker", "docker-compose", "Helm"]. */
  deploy: string[];
  /** One-click PaaS templates available, e.g. ["Coolify", "CapRover", "Railway"]. */
  oneClick: string[];
}

/** A self-hostable FOSS alternative (curated seed row). */
export interface SeedAlternative {
  name: string;
  slug: string;
  /** GitHub "owner/repo" — the live enrichment + freshness source. */
  github: string;
  homepage?: string;
  /** Curated one-liner: what it is + the self-host angle. */
  description: string;
  footprint: Footprint;
  /** Set by merge-footprint.ts once verified against official docs. */
  footprintConfidence?: "high" | "medium" | "low";
  footprintSources?: string[];
}

/** A proprietary tool people seek alternatives to (one directory page per tool). */
export interface SeedTool {
  name: string;
  slug: string;
  category: string;
  homepage?: string;
  /** What it is / why people look for a self-hostable replacement. */
  blurb: string;
  alternatives: SeedAlternative[];
}

export interface Seed {
  meta: Record<string, string>;
  tools: SeedTool[];
}

/** Live data pulled from the GitHub REST API (the freshness column). */
export interface GithubData {
  found: boolean;
  stars?: number;
  forks?: number;
  openIssues?: number;
  language?: string | null;
  license?: string | null;
  /** Last push (commit) timestamp — drives the activity component. */
  pushedAt?: string | null;
  createdAt?: string | null;
  archived?: boolean;
  latestReleaseTag?: string | null;
  latestReleaseAt?: string | null;
  fetchedAt: string;
}

/** Transparent, published 0-100 composite. Methodology is public = honesty moat. */
export interface HealthBreakdown {
  /** commit recency (max 35) */
  activity: number;
  /** latest release recency (max 25) */
  releases: number;
  /** stars → maturity (max 25) */
  maturity: number;
  /** forks → adoption (max 15) */
  adoption: number;
}

export interface EnrichedAlternative extends SeedAlternative {
  gh: GithubData;
  healthScore: number;
  healthBreakdown: HealthBreakdown;
}

export interface EnrichedTool extends Omit<SeedTool, "alternatives"> {
  alternatives: EnrichedAlternative[];
}

export interface Enriched {
  meta: Record<string, string>;
  generatedAt: string;
  tools: EnrichedTool[];
}
