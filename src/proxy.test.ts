import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

describe("Next.js proxy convention", () => {
  it("exports a named proxy function", () => {
    expect(typeof proxy).toBe("function");
  });

  it("excludes Next internals and static public assets from the matcher", () => {
    const matcher = config.matcher;
    expect(matcher).toHaveLength(1);
    const pattern = matcher[0];
    expect(pattern).toContain("_next/static");
    expect(pattern).toContain("_next/image");
    expect(pattern).toContain("favicon.ico");
    expect(pattern).toContain("manifest.webmanifest");
    expect(pattern).toContain("icons/");
    expect(pattern).toMatch(/svg\|png\|jpg/);
  });
});
