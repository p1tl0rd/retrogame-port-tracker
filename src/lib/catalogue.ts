import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";
import type { Catalogue, Game, Platform, Project } from "../types/catalogue";

type RecordKind = "game" | "project" | "platform";

function dataRoot(root = process.cwd()) {
  return resolve(root, "data");
}

function readYamlDirectory<T>(directory: string): T[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .sort()
    .map((file) => parse(readFileSync(join(directory, file), "utf8")) as T);
}

function schemaFor(kind: RecordKind, root = process.cwd()) {
  return JSON.parse(readFileSync(resolve(root, "schemas", `${kind}.schema.json`), "utf8"));
}

export function validateSchema(kind: RecordKind, records: unknown[], root = process.cwd()): string[] {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
  addFormats(ajv);
  const validate = ajv.compile(schemaFor(kind, root));
  return records.flatMap((record, index) =>
    validate(record) ? [] : (validate.errors ?? []).map((error) => `${kind}[${index}] ${error.instancePath || "/"} ${error.message}`),
  );
}

export function loadCatalogue(root = process.cwd()): Catalogue {
  const data = dataRoot(root);
  const games = readYamlDirectory<Game>(join(data, "games"));
  const projects = readYamlDirectory<Project>(join(data, "projects"));
  const platforms = readYamlDirectory<Platform>(join(data, "platforms"));
  return {
    games,
    projects,
    platforms,
    gameById: new Map(games.map((game) => [game.id, game])),
    projectById: new Map(projects.map((project) => [project.id, project])),
    platformById: new Map(platforms.map((platform) => [platform.id, platform])),
  };
}

function duplicates(ids: string[], label: string): string[] {
  return ids.filter((id, index) => ids.indexOf(id) !== index).map((id) => `Duplicate ${label}: ${id}`);
}

export function validateCatalogue(catalogue: Catalogue): string[] {
  const errors: string[] = [
    ...duplicates(catalogue.games.map((game) => game.id), "game ID"),
    ...duplicates(catalogue.projects.map((project) => project.id), "project ID"),
    ...duplicates(catalogue.platforms.map((platform) => platform.id), "platform ID"),
  ];
  const repositories: string[] = [];

  for (const game of catalogue.games) {
    for (const platformId of game.original_platforms) {
      if (!catalogue.platformById.has(platformId)) errors.push(`Game ${game.id} references unknown platform ${platformId}`);
    }
    for (const projectId of game.projects) {
      const project = catalogue.projectById.get(projectId);
      if (!project) errors.push(`Game ${game.id} references unknown project ${projectId}`);
      else if (!project.games.includes(game.id)) errors.push(`Game ${game.id} and project ${projectId} are not bidirectional`);
    }
  }

  for (const project of catalogue.projects) {
    if (project.upstream.github) repositories.push(project.upstream.github.toLowerCase());
    repositories.push(...(project.repositories ?? []).map((repository) => repository.github.toLowerCase()));
    if (project.tracking?.github_metadata === true && !project.upstream.github) {
      errors.push(`Project ${project.id} enables GitHub metadata without an upstream GitHub repository`);
    }
    for (const gameId of project.games) {
      const game = catalogue.gameById.get(gameId);
      if (!game) errors.push(`Project ${project.id} references unknown game ${gameId}`);
      else if (!game.projects.includes(project.id)) errors.push(`Project ${project.id} and game ${gameId} are not bidirectional`);
    }
    for (const platformId of Object.keys(project.modern_platforms)) {
      if (!catalogue.platformById.has(platformId)) errors.push(`Project ${project.id} references unknown target platform ${platformId}`);
    }
    if (project.status.maturity !== "unknown" && !project.evidence?.maturity) {
      errors.push(`Project ${project.id} has maturity ${project.status.maturity} without maturity evidence`);
    }
  }
  errors.push(...duplicates(repositories, "repository"));
  return [...new Set(errors)];
}

export function loadAndValidateCatalogue(root = process.cwd()): Catalogue {
  const catalogue = loadCatalogue(root);
  const errors = [
    ...validateSchema("game", catalogue.games, root),
    ...validateSchema("project", catalogue.projects, root),
    ...validateSchema("platform", catalogue.platforms, root),
    ...validateCatalogue(catalogue),
  ];
  if (errors.length) throw new Error(`Catalogue validation failed:\n${errors.join("\n")}`);
  return catalogue;
}
