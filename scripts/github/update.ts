import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { changedRelease, selectReleases, type GitHubReleaseApi } from "../../src/lib/github-release";
import { loadAndValidateCatalogue } from "../../src/lib/catalogue";
import { loadGitHubMetadata, trackedGitHubRepositories, validateGitHubMetadataRelationships } from "../../src/lib/github-metadata";
import type { GitHubMetadataSnapshot, GitHubReleaseChange, GitHubRepositoryMetadata } from "../../src/types/github";

const outputPath = resolve("data/generated/github/repositories.json");
const userAgent = "RetroPortDB-metadata/0.1 (+https://github.com/p1tl0rd/retrogame-port-tracker)";

interface RepositoryApi { html_url: string; stargazers_count: number; forks_count: number; archived: boolean; default_branch: string | null; pushed_at: string | null }
interface ApiResult<T> { value: T | null; etag: string | null; notModified: boolean }

class GitHubRateLimitError extends Error {}

async function getApi<T>(url: string, etag: string | null): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": userAgent,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (etag) headers["If-None-Match"] = etag;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") throw new GitHubRateLimitError(`GitHub rate limit reached for ${url}`);
  if (response.status === 304) return { value: null, etag, notModified: true };
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return { value: await response.json() as T, etag: response.headers.get("etag"), notModified: false };
}

function withError(previous: GitHubRepositoryMetadata | undefined, error: unknown): GitHubRepositoryMetadata | undefined {
  if (!previous) return undefined;
  const message = error instanceof Error ? error.message : String(error);
  if (previous.last_error?.message === message) return previous;
  return { ...previous, last_error: { at: new Date().toISOString(), message } };
}

async function refreshRepository(repository: string, previous: GitHubRepositoryMetadata | undefined): Promise<{ metadata: GitHubRepositoryMetadata; changes: GitHubReleaseChange[]; changed: boolean }> {
  const repositoryApi = `https://api.github.com/repos/${repository}`;
  const releasesApi = `${repositoryApi}/releases?per_page=20`;
  const repositoryResult = await getApi<RepositoryApi>(repositoryApi, previous?.cache.repository_etag ?? null);
  const releaseResult = await getApi<GitHubReleaseApi[]>(releasesApi, previous?.cache.releases_etag ?? null);
  if (previous && repositoryResult.notModified && releaseResult.notModified) return { metadata: previous, changes: [], changed: false };
  const repo = repositoryResult.value;
  const releases = releaseResult.value;
  if (!repo && !previous) throw new Error(`GitHub returned 304 for ${repository} without a cached record`);
  const previousReleases = previous?.releases;
  const selection = releases ? selectReleases(releases) : previous!.releases;
  const detectedAt = new Date().toISOString();
  const changes: GitHubReleaseChange[] = [];
  if (previousReleases) {
    const stableChange = changedRelease(previousReleases.latest_stable, selection.latest_stable);
    if (stableChange) changes.push({ repository, kind: "new_stable_release", previous_tag: previousReleases.latest_stable?.tag ?? null, current_tag: selection.latest_stable!.tag, comparison: stableChange, detected_at: detectedAt });
    const prereleaseChange = changedRelease(previousReleases.latest_prerelease, selection.latest_prerelease);
    if (prereleaseChange) changes.push({ repository, kind: "new_prerelease", previous_tag: previousReleases.latest_prerelease?.tag ?? null, current_tag: selection.latest_prerelease!.tag, comparison: prereleaseChange, detected_at: detectedAt });
  }
  return {
    metadata: {
      repository,
      url: repo?.html_url ?? previous!.url,
      fetched_at: detectedAt,
      stars: repo?.stargazers_count ?? previous!.stars,
      forks: repo?.forks_count ?? previous!.forks,
      archived: repo?.archived ?? previous!.archived,
      default_branch: repo?.default_branch ?? previous!.default_branch,
      pushed_at: repo?.pushed_at ?? previous!.pushed_at,
      releases: selection,
      cache: { repository_etag: repositoryResult.etag ?? previous?.cache.repository_etag ?? null, releases_etag: releaseResult.etag ?? previous?.cache.releases_etag ?? null },
      source: { repository_api: repositoryApi, releases_api: releasesApi },
    },
    changes,
    changed: true,
  };
}

async function writeSnapshot(snapshot: GitHubMetadataSnapshot) {
  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
}

async function main() {
  const catalogue = loadAndValidateCatalogue();
  const repositories = trackedGitHubRepositories(catalogue);
  const previous = loadGitHubMetadata();
  const relationshipErrors = validateGitHubMetadataRelationships(previous, catalogue);
  if (relationshipErrors.length) throw new Error(`GitHub metadata relationship validation failed:\n${relationshipErrors.join("\n")}`);
  const staleRepositories = Object.keys(previous.repositories).filter((repository) => !repositories.includes(repository));
  const next: GitHubMetadataSnapshot = {
    ...previous,
    repositories: Object.fromEntries(repositories.flatMap((repository) => previous.repositories[repository] ? [[repository, previous.repositories[repository]]] : [])),
    changes: [],
  };
  let changed = staleRepositories.length > 0;
  for (const repository of repositories) {
    try {
      const result = await refreshRepository(repository, previous.repositories[repository]);
      next.repositories[repository] = result.metadata;
      next.changes.push(...result.changes);
      changed ||= result.changed;
      console.log(`Refreshed ${repository}`);
    } catch (error) {
      const retained = withError(previous.repositories[repository], error);
      if (retained) next.repositories[repository] = retained;
      changed ||= retained !== previous.repositories[repository];
      console.warn(`Could not refresh ${repository}: ${error instanceof Error ? error.message : error}`);
      if (error instanceof GitHubRateLimitError) { console.warn("GitHub rate limit reached; preserving remaining cached records."); break; }
    }
  }
  if (!changed) {
    console.log("No upstream metadata changed; retained the existing generated snapshot.");
    return;
  }
  next.refreshed_at = new Date().toISOString();
  await writeSnapshot(next);
  console.log(`Wrote ${Object.keys(next.repositories).length} generated repository records and ${next.changes.length} release changes.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
