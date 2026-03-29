import { describe, expect, it } from "vitest";
import { getRouteSeo } from "./seo";

describe("getRouteSeo", () => {
  it("builds scholarship metadata", () => {
    const seo = getRouteSeo({
      view: "scholarship",
      pathname: "/scholarships/chevening-scholarship",
      scholarshipName: "Chevening Scholarship",
      scholarshipRecord: {
        country: "United Kingdom",
        funder: "FCDO",
        results_timeline: "March to June",
      },
      scholarshipEntryCount: 12,
    });

    expect(seo.title).toContain("Chevening Scholarship");
    expect(seo.description).toContain("12 public reports");
    expect(seo.canonicalUrl).toContain("/scholarships/chevening-scholarship");
  });

  it("returns article metadata for blog posts", () => {
    const seo = getRouteSeo({
      view: "blogPost",
      pathname: "/blog/launch-notes",
      blogPost: {
        title: "Launch notes",
        excerpt: "What changed in Awaited this week.",
      },
    });

    expect(seo.type).toBe("article");
    expect(seo.title).toContain("Launch notes");
  });
});
