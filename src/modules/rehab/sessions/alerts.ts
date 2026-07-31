import type {
  RehabAlertType,
  RehabInstabilityLevel,
  RehabRestrictionSeverity,
  RehabSwellingLevel,
} from "@/modules/rehab/types";

export type AlertDetectionInput = {
  painLimit: number | null;
  painBefore: number | null;
  painDuring: number | null;
  painAfter: number | null;
  swelling: RehabSwellingLevel | null;
  instability: RehabInstabilityLevel | null;
  stopConditionTriggered: boolean;
  userStoppedSet: boolean;
};

export type DetectedAlert = {
  alertType: RehabAlertType;
  severity: RehabRestrictionSeverity;
  message: string;
};

function maxPain(input: AlertDetectionInput): number | null {
  const values = [input.painBefore, input.painDuring, input.painAfter].filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  return values.length ? Math.max(...values) : null;
}

/** Pure alert detection — records threshold crossings, not diagnoses. */
export function detectSetAlerts(input: AlertDetectionInput): DetectedAlert[] {
  const alerts: DetectedAlert[] = [];
  const peakPain = maxPain(input);

  if (input.painLimit != null && peakPain != null && peakPain > input.painLimit) {
    alerts.push({
      alertType: "pain_threshold",
      severity: "caution",
      message: `Recorded pain (${peakPain}) exceeded your plan limit (${input.painLimit}).`,
    });
  }

  if (input.swelling === "severe") {
    alerts.push({
      alertType: "severe_swelling",
      severity: "caution",
      message: "Swelling marked as severe.",
    });
  }

  if (input.instability === "severe") {
    alerts.push({
      alertType: "severe_instability",
      severity: "caution",
      message: "Instability marked as severe.",
    });
  }

  if (input.stopConditionTriggered) {
    alerts.push({
      alertType: "stop_condition",
      severity: "stop",
      message: "A stop condition was selected.",
    });
  }

  if (input.userStoppedSet) {
    alerts.push({
      alertType: "user_stopped_set",
      severity: "caution",
      message: "Set was stopped by you.",
    });
  }

  return alerts;
}

export function hasUnacknowledgedAlerts(
  alerts: readonly { acknowledgedAt: string | null }[],
): boolean {
  return alerts.some((a) => !a.acknowledgedAt);
}

export function shouldPauseProgression(alerts: readonly DetectedAlert[]): boolean {
  return alerts.length > 0;
}
