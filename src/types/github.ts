import type { ReleaseSelection, VersionComparison } from "../lib/github-release";

export interface GitHubRepositoryMetadata {
  repository: string;
  url: string;
  fetched_at: string;
  stars: number;
  forks: number;
  archived: boolean;
  default_branch: string | null;
  pushed_at: string | null;
  releases: ReleaseSelection;
  cache: { repository_etag: string | null; releases_etag: string | null };
  source: { repository_api: string; releases_api: string };
  last_error?: { at: string; message: string };
}

export interface GitHubReleaseChange {
  repository: string;
  kind: "new_stable_release" | "new_prerelease";
  previous_tag: string | null;
  current_tag: string;
  comparison: VersionComparison | "new";
  detected_at: string;
}

export interface GitHubMetadataSnapshot {
  schema_version: 1;
  refreshed_at: string | null;
  repositories: Record<string, GitHubRepositoryMetadata>;
  changes: GitHubReleaseChange[];
}
