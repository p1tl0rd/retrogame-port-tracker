# AGENTS.md

## Purpose

RetroPortDB tracks modern ports and reconstructions of classic games. It is not
an emulator or ROM catalogue.

## Non-negotiable data rule

Curated YAML under `data/games`, `data/projects`, and `data/platforms` is human
owned. Generated data belongs only in `data/generated`. Automation must never
overwrite curated fields. Do not invent repositories, compatibility, maturity,
progress, releases, or relationships. Use `unknown` when evidence is absent.

## Commands

```bash
npm install
npm run dev
npm run validate
npm run test
npm run build
```

## Adding data

Add a game and a project as separate YAML files with stable lowercase IDs. Keep
their relationships bidirectional. A project needs an upstream URL, controlled
type, target-support states, requirements, and evidence for any non-unknown
maturity. Run validation before opening a pull request.

## Conventions

Use strict TypeScript, small pure domain helpers, and accessible semantic HTML.
Use `basePath()` for internal links. Keep frontend components presentation-focused;
catalogue loading and validation live in `src/lib`. GitHub workflows deploy a
static Astro build through GitHub Pages.

## Future systems

Discovery produces review-only candidates. Progress adapters may show upstream
metrics but never invent a universal percentage. GitHub metadata is a generated
snapshot, not an authority on maturity or compatibility.
