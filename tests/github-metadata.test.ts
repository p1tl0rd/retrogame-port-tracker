import { describe, expect, it } from "vitest";
import { loadGitHubMetadata, metadataForProject, trackedGitHubRepositories, validateGitHubMetadataRelationships, validateGitHubMetadataSnapshot } from "../src/lib/github-metadata";
import { loadCatalogue } from "../src/lib/catalogue";

describe("generated GitHub metadata", () => {
  it("validates the checked-in snapshot and maps it only through curated upstream IDs", () => {
    const snapshot = loadGitHubMetadata();
    const catalogue = loadCatalogue();
    expect(validateGitHubMetadataSnapshot(snapshot)).toEqual([]);
    expect(validateGitHubMetadataRelationships(snapshot, catalogue)).toEqual([]);
    expect(trackedGitHubRepositories(catalogue)).toContain("OpenTTD/OpenTTD");
    expect(metadataForProject(snapshot, catalogue.projectById.get("openttd")!)?.repository).toBe("OpenTTD/OpenTTD");
    expect(metadataForProject(snapshot, catalogue.projectById.get("openmw")!)).toBeUndefined();
  });

  it("rejects incomplete generated records", () => {
    expect(validateGitHubMetadataSnapshot({ schema_version: 1, refreshed_at: null, repositories: {}, changes: [{ repository: "owner/repo" }] })).not.toEqual([]);
  });

  it("rejects orphaned and mismatched generated records and respects opt-outs", () => {
    const snapshot = loadGitHubMetadata();
    const catalogue = loadCatalogue();
    const openttd = catalogue.projectById.get("openttd")!;
    const orphaned = {
      ...snapshot,
      repositories: {
        ...snapshot.repositories,
        "example/orphan": { ...snapshot.repositories["OpenTTD/OpenTTD"], repository: "wrong/repository" },
      },
    };
    const errors = validateGitHubMetadataRelationships(orphaned, catalogue);
    expect(errors).toContain("Generated GitHub record example/orphan is not enabled by a curated project");
    expect(errors).toContain("Generated GitHub record key example/orphan does not match its repository value wrong/repository");
    expect(metadataForProject(snapshot, { ...openttd, tracking: { ...openttd.tracking, github_metadata: false } })).toBeUndefined();
  });
});
