import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { Catalogue, Project } from "../types/catalogue";
import type { GitHubMetadataSnapshot, GitHubRepositoryMetadata } from "../types/github";

export function emptyGitHubMetadataSnapshot(): GitHubMetadataSnapshot {
  return { schema_version: 1, refreshed_at: null, repositories: {}, changes: [] };
}

export function validateGitHubMetadataSnapshot(snapshot: unknown, root = process.cwd()): string[] {
  const schema = JSON.parse(readFileSync(resolve(root, "schemas/github-metadata.schema.json"), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  return validate(snapshot) ? [] : (validate.errors ?? []).map((error) => `GitHub metadata${error.instancePath || "/"} ${error.message}`);
}

export function loadGitHubMetadata(root = process.cwd()): GitHubMetadataSnapshot {
  const path = resolve(root, "data/generated/github/repositories.json");
  if (!existsSync(path)) return emptyGitHubMetadataSnapshot();
  const snapshot = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const errors = validateGitHubMetadataSnapshot(snapshot, root);
  if (errors.length) throw new Error(`GitHub metadata validation failed:\n${errors.join("\n")}`);
  return snapshot as GitHubMetadataSnapshot;
}

export function trackedGitHubRepositories(catalogue: Pick<Catalogue, "projects">): string[] {
  return [...new Set(catalogue.projects.flatMap((project) =>
    project.tracking?.github_metadata === true && project.upstream.github ? [project.upstream.github] : [],
  ))].sort();
}

export function validateGitHubMetadataRelationships(snapshot: GitHubMetadataSnapshot, catalogue: Pick<Catalogue, "projects">): string[] {
  const errors: string[] = [];
  const trackedRepositories = new Set(trackedGitHubRepositories(catalogue));

  for (const project of catalogue.projects) {
    if (project.tracking?.github_metadata === true && !project.upstream.github) {
      errors.push(`Project ${project.id} enables GitHub metadata without an upstream GitHub repository`);
    }
  }

  for (const [repository, record] of Object.entries(snapshot.repositories)) {
    if (!trackedRepositories.has(repository)) errors.push(`Generated GitHub record ${repository} is not enabled by a curated project`);
    if (record.repository !== repository) errors.push(`Generated GitHub record key ${repository} does not match its repository value ${record.repository}`);
  }
  for (const change of snapshot.changes) {
    if (!trackedRepositories.has(change.repository)) errors.push(`Generated GitHub change ${change.repository} is not enabled by a curated project`);
  }
  return errors;
}

export function metadataForProject(snapshot: GitHubMetadataSnapshot, project: Project): GitHubRepositoryMetadata | undefined {
  return project.tracking?.github_metadata === true && project.upstream.github
    ? snapshot.repositories[project.upstream.github]
    : undefined;
}
