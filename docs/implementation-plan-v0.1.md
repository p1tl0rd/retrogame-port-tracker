# V0.1 implementation plan

## Goal

Deliver a static, GitHub Pages-compatible site backed by validated curated data.
V0.1 establishes the database contract and browsing experience; it does not infer
project maturity, scrape GitHub, or publish discovery candidates automatically.

## Deliverables

1. Strict YAML schemas, a TypeScript domain layer, and relation validation.
2. A small, evidence-backed seed database spanning several classic platforms and
   project types.
3. Static game, project, platform, type, activity, and information pages.
4. Progressive-enhancement search and filters, a local-only watchlist, sitemap,
   and global Atom feed.
5. Offline tests, CI validation, and GitHub Pages deployment.

## Acceptance criteria

- `npm run validate`, `npm run test`, and `npm run build` succeed.
- Invalid curated data fails before a site is built.
- Every relationship is bidirectional and every cited URL is valid.
- Public pages are static and remain browseable without JavaScript.
- Curated records cannot be overwritten by generated data.

## Deferred work

V0.2 adds cached GitHub metadata and activity scoring. V0.3 adds review-only
discovery candidates. V0.4 adds progress adapters. No deferred subsystem may
modify curated records without human review and evidence.

## V0.2 tracking design update

The metadata updater now has an implementation-ready release design informed by
GithubLauncher: conditional HTTP requests, a configurable authenticated token,
release-tag comparison, and a persisted last-check cache. RetroPortDB differs in
one important way: it never downloads or installs releases. It stores release
observations only, distinguishes stable from prerelease releases, handles no-release
repositories explicitly, and emits reviewable generated change records.
