import { describe, expect, it } from "vitest";
import {
  detectSetAlerts,
  hasUnacknowledgedAlerts,
  shouldPauseProgression,
} from "@/modules/rehab/sessions/alerts";

describe("detectSetAlerts", () => {
  it("detects pain threshold crossing", () => {
    const alerts = detectSetAlerts({
      painLimit: 4,
      painBefore: 2,
      painDuring: 6,
      painAfter: 3,
      swelling: null,
      instability: null,
      stopConditionTriggered: false,
      userStoppedSet: false,
    });
    expect(alerts.some((a) => a.alertType === "pain_threshold")).toBe(true);
  });

  it("detects severe swelling", () => {
    const alerts = detectSetAlerts({
      painLimit: null,
      painBefore: null,
      painDuring: null,
      painAfter: null,
      swelling: "severe",
      instability: null,
      stopConditionTriggered: false,
      userStoppedSet: false,
    });
    expect(alerts[0]?.alertType).toBe("severe_swelling");
  });

  it("detects user stopped set", () => {
    const alerts = detectSetAlerts({
      painLimit: null,
      painBefore: null,
      painDuring: null,
      painAfter: null,
      swelling: null,
      instability: null,
      stopConditionTriggered: false,
      userStoppedSet: true,
    });
    expect(alerts.some((a) => a.alertType === "user_stopped_set")).toBe(true);
  });
});

describe("hasUnacknowledgedAlerts", () => {
  it("returns true when any alert lacks acknowledgment", () => {
    expect(
      hasUnacknowledgedAlerts([
        { acknowledgedAt: null },
        { acknowledgedAt: "2026-07-31T10:00:00Z" },
      ]),
    ).toBe(true);
  });
});

describe("shouldPauseProgression", () => {
  it("pauses when alerts are present", () => {
    expect(
      shouldPauseProgression([
        {
          alertType: "pain_threshold",
          severity: "caution",
          message: "test",
        },
      ]),
    ).toBe(true);
  });
});
