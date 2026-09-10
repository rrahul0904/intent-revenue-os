import { describe, expect, it } from "vitest";
import { normalizeRedditPost } from "../src/adapters/sources/reddit";

describe("Reddit source normalization", () => {
  it("normalizes a Reddit link listing into the source model", () => {
    const post = normalizeRedditPost({
      kind: "t3",
      data: {
        id: "abc123",
        title: "Looking for an intake tool",
        selftext: "Our spreadsheet is failing and we need something better.",
        permalink: "/r/operations/comments/abc123/example/",
        subreddit: "operations",
        subreddit_name_prefixed: "r/operations",
        author: "ops_person",
        created_utc: 1_700_000_000,
      },
    });

    expect(post).not.toBeNull();
    expect(post?.platform).toBe("reddit");
    expect(post?.externalId).toBe("abc123");
    expect(post?.community).toBe("operations");
    expect(post?.url).toContain("reddit.com/r/operations");
    expect(post?.contentHash).toHaveLength(64);
  });

  it("ignores non-post listing children", () => {
    expect(normalizeRedditPost({ kind: "t1", data: { id: "comment" } })).toBeNull();
  });
});
