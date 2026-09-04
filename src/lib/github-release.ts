export interface GitHubReleaseApi {
  tag_name: string;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
}

export interface ReleaseSummary {
  tag: string;
  url: string;
  published_at: string | null;
}

export type ReleaseState = "stable" | "prerelease_only" | "none";
export type VersionComparison = "newer" | "same" | "older" | "incomparable";
export type ReleaseReadiness = "no_stable_release" | "pre_1_0" | "version_1_or_newer" | "unclassified";

export interface ReleaseSelection {
  state: ReleaseState;
  latest_stable: ReleaseSummary | null;
  latest_prerelease: ReleaseSummary | null;
}

function toSummary(release: GitHubReleaseApi): ReleaseSummary {
  return { tag: release.tag_name, url: release.html_url, published_at: release.published_at };
}

export function selectReleases(releases: GitHubReleaseApi[]): ReleaseSelection {
  const published = releases.filter((release) => !release.draft && release.tag_name.trim());
  const stable = published.find((release) => !release.prerelease);
  const prerelease = published.find((release) => release.prerelease);
  return {
    state: stable ? "stable" : prerelease ? "prerelease_only" : "none",
    latest_stable: stable ? toSummary(stable) : null,
    latest_prerelease: prerelease ? toSummary(prerelease) : null,
  };
}

function parseNumericVersion(tag: string): number[] | null {
  const match = tag.trim().match(/^v?(\d+(?:\.\d+){0,3})$/i);
  return match ? match[1].split(".").map(Number) : null;
}

export function releaseReadiness(releases: ReleaseSelection): ReleaseReadiness {
  const version = releases.latest_stable ? parseNumericVersion(releases.latest_stable.tag) : null;
  if (!releases.latest_stable) return "no_stable_release";
  if (!version) return "unclassified";
  return version[0] >= 1 ? "version_1_or_newer" : "pre_1_0";
}

export function compareReleaseTags(next: string, previous: string): VersionComparison {
  const nextParts = parseNumericVersion(next);
  const previousParts = parseNumericVersion(previous);
  if (!nextParts || !previousParts) return "incomparable";
  const length = Math.max(nextParts.length, previousParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (nextParts[index] ?? 0) - (previousParts[index] ?? 0);
    if (difference > 0) return "newer";
    if (difference < 0) return "older";
  }
  return "same";
}

export function changedRelease(previous: ReleaseSummary | null | undefined, next: ReleaseSummary | null): VersionComparison | "new" | null {
  if (previous === undefined || !next) return null;
  if (previous === null) return "new";
  if (previous.tag === next.tag) return null;
  return compareReleaseTags(next.tag, previous.tag);
}
