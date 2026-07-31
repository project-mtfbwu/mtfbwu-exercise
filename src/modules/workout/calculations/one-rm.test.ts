import { describe, expect, it } from "vitest";
import { brzyckiEstimate, epleyEstimate } from "./index";

describe("epleyEstimate", () => {
  it("estimates a 1RM from a submaximal set", () => {
    expect(epleyEstimate(225, 8)).toBeCloseTo(285, 5);
    expect(epleyEstimate(100, 12)).toBeCloseTo(140, 5);
  });

  it("returns the load unchanged at a single rep", () => {
    expect(epleyEstimate(100, 1)).toBe(100);
  });

  it.each([
    ["zero reps", 100, 0],
    ["above the 12-rep ceiling", 100, 13],
    ["a non-positive load", 0, 5],
    ["a negative load", -50, 5],
  ])("returns null for %s", (_, load, reps) => {
    expect(epleyEstimate(load, reps)).toBeNull();
  });
});

describe("brzyckiEstimate", () => {
  it("estimates a 1RM from a submaximal set", () => {
    expect(brzyckiEstimate(225, 8)).toBeCloseTo(279.310345, 5);
    expect(brzyckiEstimate(100, 12)).toBeCloseTo(144, 5);
  });

  it("returns the load unchanged at a single rep", () => {
    expect(brzyckiEstimate(100, 1)).toBe(100);
  });

  it.each([
    ["zero reps", 100, 0],
    ["above the 12-rep ceiling", 100, 13],
    ["a non-positive load", 0, 5],
    ["a negative load", -50, 5],
  ])("returns null for %s", (_, load, reps) => {
    expect(brzyckiEstimate(load, reps)).toBeNull();
  });
});

describe("estimate divergence from measured truth", () => {
  it("agrees the two formulas are estimates, not identical measured values", () => {
    const epley = epleyEstimate(225, 8);
    const brzycki = brzyckiEstimate(225, 8);
    expect(epley).not.toBeNull();
    expect(brzycki).not.toBeNull();
    expect(epley).not.toBe(brzycki);
  });
});
