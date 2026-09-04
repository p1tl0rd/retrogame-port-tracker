import { loadAndValidateCatalogue } from "../../src/lib/catalogue";
import { loadGitHubMetadata, validateGitHubMetadataRelationships } from "../../src/lib/github-metadata";

try {
  const catalogue = loadAndValidateCatalogue();
  const githubMetadata = loadGitHubMetadata();
  const relationshipErrors = validateGitHubMetadataRelationships(githubMetadata, catalogue);
  if (relationshipErrors.length) throw new Error(`GitHub metadata relationship validation failed:\n${relationshipErrors.join("\n")}`);
  console.log(`Validated ${catalogue.games.length} games, ${catalogue.projects.length} projects, ${catalogue.platforms.length} platforms, and ${Object.keys(githubMetadata.repositories).length} generated GitHub records.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
