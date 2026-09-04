# GitHub Metadata Tracking

`npm run metadata:update` refreshes generated repository observations only for
curated projects with both `upstream.github` and `tracking.github_metadata: true`.
It does not edit curated YAML. The design adapts GithubLauncher’s
conditional-request cache, explicit User-Agent, optional token, and release-tag
comparison patterns, while deliberately excluding all download, installation,
launching, and client-update behavior.

## What is recorded

- repository URL, stars, forks, archive status, default branch, and last push time
- latest stable and latest prerelease release independently
- explicit `none`, `prerelease_only`, or `stable` release state
- ETags and per-endpoint source URLs for conditional requests
- generated new-release change records when a known stable/prerelease tag changes

## Reliability rules

Set `GITHUB_TOKEN` (or `GH_TOKEN`) in CI for higher API limits. Unauthenticated
runs remain supported. The updater sends `If-None-Match`, limits concurrency, and
stops scheduling new work after a rate-limit response. It writes a temporary JSON
file and atomically replaces the snapshot only after processing completes.

Errors never erase the prior valid record. Release tags are compared only when
both resemble numeric versions after an optional `v` prefix. Otherwise the tag
change remains observable but its ordering is recorded as `incomparable`.

## Boundaries

Generated release changes may later inform the timeline, but they do not establish
maturity, compatibility, game identity, or legal status. Draft releases are ignored.
This project does not download, install, launch, or manage software releases.

The generated snapshot is cross-checked against those explicit opt-ins. Records
and release changes for an untracked repository, or a record whose JSON key does
not match its `repository` value, fail validation rather than being displayed.
