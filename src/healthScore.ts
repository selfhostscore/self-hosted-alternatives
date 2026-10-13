// Self-Host Health Score — a transparent, published 0-100 composite.
// The methodology being PUBLIC is the point: it is an aggregation/curation moat,
// not a secret one. Inspired by OpenSSF Criticality Score + CHAOSS health metrics,
// kept to what a single GitHub repo fetch (+ latest release) can compute cheaply.
//
// Components (max points): activity 35, releases 25, maturity 25, adoption 15.

import type { GithubData, HealthBreakdown } from "./types.ts";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function daysSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return (nowMs - t) / 86_400_000;
}

/** Linear decay: 1 at <= freshDays, 0 at >= staleDays. */
function recency(days: number | null, freshDays: number, staleDays: number): number {
  if (days === null) return 0;
  if (days <= freshDays) return 1;
  if (days >= staleDays) return 0;
  return 1 - (days - freshDays) / (staleDays - freshDays);
}

/** Log-scaled saturation: 0 at 0, ~1 at `full`. Dampens whale-repo dominance. */
function logScale(value: number | undefined, full: number): number {
  if (!value || value <= 0) return 0;
  return clamp01(Math.log10(value + 1) / Math.log10(full + 1));
}

export function computeHealth(
  gh: GithubData,
  nowMs: number,
): { score: number; breakdown: HealthBreakdown } {
  // Dead / missing repos score 0 — exactly what a self-hoster must avoid.
  if (!gh.found || gh.archived) {
    return { score: 0, breakdown: { activity: 0, releases: 0, maturity: 0, adoption: 0 } };
  }

  const activityR = recency(daysSince(gh.pushedAt, nowMs), 30, 365);
  // No formal releases → small floor (has code, just no tagged versions).
  const releasesR = gh.latestReleaseAt
    ? recency(daysSince(gh.latestReleaseAt, nowMs), 90, 540)
    : 0.2;
  const maturityR = logScale(gh.stars, 50_000);
  const adoptionR = logScale(gh.forks, 10_000);

  const breakdown: HealthBreakdown = {
    activity: Math.round(activityR * 35),
    releases: Math.round(releasesR * 25),
    maturity: Math.round(maturityR * 25),
    adoption: Math.round(adoptionR * 15),
  };

  const score =
    breakdown.activity + breakdown.releases + breakdown.maturity + breakdown.adoption;

  return { score, breakdown };
}

/** Human-readable band for UI copy / synthesis layer. */
export function healthLabel(score: number): string {
  if (score >= 80) return "Thriving";
  if (score >= 60) return "Healthy";
  if (score >= 40) return "Steady";
  if (score >= 20) return "At risk";
  return "Dormant";
}
