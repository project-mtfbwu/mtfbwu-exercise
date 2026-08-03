import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("security headers config", () => {
  it("enables camera=(self) and worker-src blob in next.config.ts", () => {
    const source = readFileSync(resolve("next.config.ts"), "utf8");
    expect(source).toContain("camera=(self)");
    expect(source).toContain("worker-src 'self' blob:");
    expect(source).toContain("X-Frame-Options");
    expect(source).toContain("same-origin");
  });
});
