import { describe, expect, it } from "vitest";

import { createScanDedupe } from "./dedupe";

describe("createScanDedupe", () => {
  it("accepts the first scan of a code", () => {
    const dedupe = createScanDedupe({ cooldownMs: 2500 });
    expect(dedupe.accept("3017620422003")).toBe(true);
  });

  it("rejects the same code scanned again within the cooldown window", () => {
    let now = 0;
    const dedupe = createScanDedupe({ cooldownMs: 2500, now: () => now });
    expect(dedupe.accept("3017620422003")).toBe(true);
    now += 1000;
    expect(dedupe.accept("3017620422003")).toBe(false);
  });

  it("accepts the same code again once the cooldown window has elapsed", () => {
    let now = 0;
    const dedupe = createScanDedupe({ cooldownMs: 2500, now: () => now });
    expect(dedupe.accept("3017620422003")).toBe(true);
    now += 2500;
    expect(dedupe.accept("3017620422003")).toBe(true);
  });

  it("accepts a different code immediately, even inside the cooldown window", () => {
    let now = 0;
    const dedupe = createScanDedupe({ cooldownMs: 2500, now: () => now });
    expect(dedupe.accept("3017620422003")).toBe(true);
    now += 100;
    expect(dedupe.accept("0036000291452")).toBe(true);
  });

  it("rejects every scan while locked, regardless of cooldown or code", () => {
    const dedupe = createScanDedupe({ cooldownMs: 2500 });
    dedupe.lock();
    expect(dedupe.isLocked).toBe(true);
    expect(dedupe.accept("3017620422003")).toBe(false);
    expect(dedupe.accept("0036000291452")).toBe(false);
  });

  it("resumes accepting scans after unlock", () => {
    const dedupe = createScanDedupe({ cooldownMs: 2500 });
    dedupe.lock();
    dedupe.unlock();
    expect(dedupe.isLocked).toBe(false);
    expect(dedupe.accept("3017620422003")).toBe(true);
  });
});
