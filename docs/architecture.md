# Architecture

## Data ownership

`data/games`, `data/projects`, and `data/platforms` are curated YAML records.
They contain stable identities, relationships, classification, support claims,
and evidence. Human review owns these files.

`data/generated` is reserved for machine-generated snapshots. Future GitHub,
discovery, activity, and progress jobs may write only there. Build-time code can
join generated snapshots to curated records but never treats generated content as
a replacement for a curated fact.

## Build path

YAML is loaded and schema-validated by `src/lib/catalogue.ts`. Domain validation
then checks IDs, relationships, unique repositories, and evidence. Astro consumes
the validated catalogue at build time to produce static HTML. Search filtering is
a small optional client script over rendered cards, so catalogue browsing works
without JavaScript.

## Future pipelines

Metadata, discovery, and progress jobs will generate timestamped files under
`data/generated`. Each generated fact must retain source and retrieval time.
Updates are written atomically and must preserve the previous valid snapshot when
an upstream request fails.

## GitHub metadata and releases

The V0.2 metadata updater reads only curated `upstream.github` repository IDs and
writes `data/generated/github/repositories.json`. It uses a distinct conditional
request cache (ETag) for repository and release-list endpoints, sends an explicit
User-Agent, and can use the GitHub Actions token without requiring a token locally.

Release tracking lists releases rather than relying exclusively on GitHub's
`/releases/latest` endpoint: drafts are ignored, stable and prerelease releases
are recorded separately, and a repository with no releases is an explicit state.
Tag comparison is advisory only; unparseable tags are marked incomparable rather
than guessed. A changed stable tag creates a generated `new_stable_release`
change, never a curated maturity transition. Rate-limit or request failures retain
the previous valid repository snapshot and record the failure timestamp.
