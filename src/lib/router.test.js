import { describe, expect, it } from "vitest";
import { parseAppRoute } from "./router";

describe("parseAppRoute", () => {
  it("parses scholarship routes", () => {
    expect(parseAppRoute("/scholarships/chevening-scholarship")).toEqual({
      view: "scholarship",
      scholarshipSlug: "chevening-scholarship",
      blogSlug: null,
      forumSlug: null,
    });
  });

  it("parses blog post routes", () => {
    expect(parseAppRoute("/blog/launch-notes")).toEqual({
      view: "blogPost",
      scholarshipSlug: null,
      blogSlug: "launch-notes",
      forumSlug: null,
    });
  });

  it("falls back to the feed for unknown routes", () => {
    expect(parseAppRoute("/missing-page")).toEqual({
      view: "feed",
      scholarshipSlug: null,
      blogSlug: null,
      forumSlug: null,
    });
  });
});
