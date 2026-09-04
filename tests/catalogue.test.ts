import { describe, expect, it } from "vitest";
import { loadCatalogue, validateCatalogue } from "../src/lib/catalogue";

describe("catalogue domain validation", () => {
  it("accepts the checked-in curated catalogue", () => {
    expect(validateCatalogue(loadCatalogue())).toEqual([]);
  });

  it("rejects a maturity claim with no evidence", () => {
    const catalogue = loadCatalogue();
    const project = catalogue.projects[0];
    const { maturity: _maturity, ...evidenceWithoutMaturity } = project.evidence ?? {};
    const invalidProject = { ...project, status: { ...project.status, maturity: "playable" as const }, evidence: evidenceWithoutMaturity };
    const invalid = { ...catalogue, projects: [invalidProject], projectById: new Map([[project.id, invalidProject]]) };
    expect(validateCatalogue(invalid)).toContain(`Project ${project.id} has maturity playable without maturity evidence`);
  });
});
