import { describe, expect, it } from "vitest";
import { changedRelease, compareReleaseTags, releaseReadiness, selectReleases } from "../src/lib/github-release";

describe("GitHub release selection", () => {
  it("keeps stable and prerelease releases separate and ignores drafts", () => {
    const selection = selectReleases([
      { tag_name: "v3.0.0-rc1", html_url: "https://example.test/rc", published_at: "2026-01-03T00:00:00Z", prerelease: true, draft: false },
      { tag_name: "v2.0.0", html_url: "https://example.test/stable", published_at: "2026-01-02T00:00:00Z", prerelease: false, draft: false },
      { tag_name: "v4.0.0", html_url: "https://example.test/draft", published_at: null, prerelease: false, draft: true },
    ]);
    expect(selection.state).toBe("stable");
    expect(selection.latest_stable?.tag).toBe("v2.0.0");
    expect(selection.latest_prerelease?.tag).toBe("v3.0.0-rc1");
  });

  it("expresses no-release and prerelease-only repositories without guessing", () => {
    expect(selectReleases([]).state).toBe("none");
    expect(selectReleases([{ tag_name: "preview", html_url: "https://example.test", published_at: null, prerelease: true, draft: false }]).state).toBe("prerelease_only");
  });

  it("compares simple tags and leaves non-numeric tags incomparable", () => {
    expect(compareReleaseTags("v1.10.0", "1.9.0")).toBe("newer");
    expect(compareReleaseTags("1.0", "v1.0.0")).toBe("same");
    expect(compareReleaseTags("nightly", "v1.0.0")).toBe("incomparable");
    expect(changedRelease({ tag: "v1.0.0", url: "x", published_at: null }, { tag: "v1.1.0", url: "x", published_at: null })).toBe("newer");
    expect(changedRelease(null, { tag: "first-release", url: "x", published_at: null })).toBe("new");
  });

  it("classifies stable release tags without inferring playability", () => {
    expect(releaseReadiness(selectReleases([]))).toBe("no_stable_release");
    expect(releaseReadiness(selectReleases([{ tag_name: "v0.9.8", html_url: "https://example.test", published_at: null, prerelease: false, draft: false }]))).toBe("pre_1_0");
    expect(releaseReadiness(selectReleases([{ tag_name: "1.0", html_url: "https://example.test", published_at: null, prerelease: false, draft: false }]))).toBe("version_1_or_newer");
    expect(releaseReadiness(selectReleases([{ tag_name: "nightly", html_url: "https://example.test", published_at: null, prerelease: false, draft: false }]))).toBe("unclassified");
  });
});
