/**
 * View types for the persisted rehab engine (plans/phases/days/sessions).
 * Kept separate from workout types — rehab has phases, restrictions, symptom
 * scales, and clinician provenance that workouts do not model.
 */

export const REHAB_SIDES = ["left", "right", "bilateral", "not_applicable"] as const;
export type RehabSide = (typeof REHAB_SIDES)[number];

export const REHAB_PHASE_TYPES = [
  "protection",
  "mobility",
  "activation",
  "strength",
  "control",
  "return_to_activity",
  "custom",
] as const;
export type RehabPhaseType = (typeof REHAB_PHASE_TYPES)[number];

export const REHAB_COMPLETION_RULES = [
  "exact",
  "range",
  "duration",
  "hold",
  "manual",
] as const;
export type RehabCompletionRule = (typeof REHAB_COMPLETION_RULES)[number];

export const REHAB_SET_STATUSES = [
  "pending",
  "completed",
  "skipped",
  "stopped",
  "partial",
] as const;
export type RehabSetStatus = (typeof REHAB_SET_STATUSES)[number];

export const REHAB_SESSION_STATUSES = [
  "in_progress",
  "paused",
  "completed",
  "discarded",
] as const;
export type RehabSessionStatus = (typeof REHAB_SESSION_STATUSES)[number];

export const REHAB_SWELLING_LEVELS = ["none", "mild", "moderate", "severe"] as const;
export type RehabSwellingLevel = (typeof REHAB_SWELLING_LEVELS)[number];

export const REHAB_INSTABILITY_LEVELS = ["none", "slight", "moderate", "severe"] as const;
export type RehabInstabilityLevel = (typeof REHAB_INSTABILITY_LEVELS)[number];

export const REHAB_RESTRICTION_TYPES = [
  "load_limit",
  "range_limit",
  "movement_avoidance",
  "assistance_required",
  "weight_bearing",
  "frequency_limit",
  "stop_condition",
  "clinician_instruction",
  "custom",
] as const;
export type RehabRestrictionType = (typeof REHAB_RESTRICTION_TYPES)[number];

export const REHAB_RESTRICTION_SEVERITIES = ["informational", "caution", "stop"] as const;
export type RehabRestrictionSeverity = (typeof REHAB_RESTRICTION_SEVERITIES)[number];

export const REHAB_ALERT_TYPES = [
  "pain_threshold",
  "severe_swelling",
  "severe_instability",
  "stop_condition",
  "user_stopped_set",
  "other",
] as const;
export type RehabAlertType = (typeof REHAB_ALERT_TYPES)[number];

export const REHAB_CLINICIAN_SOURCE_TYPES = [
  "physiotherapist",
  "orthopedic",
  "sports_medicine",
  "trainer",
  "self_entered",
  "document",
  "other",
] as const;
export type RehabClinicianSourceType = (typeof REHAB_CLINICIAN_SOURCE_TYPES)[number];

export const REHAB_OBSERVATION_TYPES = [
  "pain",
  "swelling",
  "instability",
  "stiffness",
  "confidence",
  "fatigue",
  "range",
  "general",
] as const;
export type RehabObservationType = (typeof REHAB_OBSERVATION_TYPES)[number];

/** Pain and confidence use 0–10 user-entered scales. */
export const PAIN_SCALE = {
  min: 0,
  max: 10,
  labels: {
    0: "None",
    10: "Worst imaginable",
  },
} as const;

export const CONFIDENCE_SCALE = {
  min: 0,
  max: 10,
  labels: {
    0: "No confidence",
    10: "Fully confident",
  },
} as const;

/** Hints for session observation form fields — symptom tracking, not diagnosis. */
export const OBSERVATION_SCALE_HINTS: Record<
  RehabObservationType,
  { numeric?: string; text?: string }
> = {
  pain: { numeric: "0 = none, 10 = worst imaginable" },
  swelling: { text: "Describe location and severity in your own words" },
  instability: { text: "Note giving-way or looseness — not a diagnosis" },
  stiffness: { numeric: "0 = none, 10 = very stiff" },
  confidence: { numeric: "0 = no confidence, 10 = fully confident" },
  fatigue: { numeric: "0 = none, 10 = exhausted" },
  range: { numeric: "Degrees or your own scale — optional" },
  general: { text: "Freeform note — symptoms only, not a diagnosis" },
};

export const SWELLING_LABELS: Record<RehabSwellingLevel, string> = {
  none: "None",
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

export const INSTABILITY_LABELS: Record<RehabInstabilityLevel, string> = {
  none: "None",
  slight: "Slight",
  moderate: "Moderate",
  severe: "Severe",
};

export type RehabExerciseCatalogView = {
  id: string;
  stableKey: string;
  name: string;
  exerciseCategory: string;
  bilateral: boolean;
  loadSupported: boolean;
  holdSupported: boolean;
  durationSupported: boolean;
  assistanceSupported: boolean;
  romTrackingSupported: boolean;
};

export type RehabPrescriptionView = {
  id: string;
  setIndex: number;
  completionRule: RehabCompletionRule;
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetHoldSeconds: number | null;
  targetLoad: number | null;
  targetLoadUnit: string | null;
  tempoEccentricSeconds: number | null;
  tempoPauseBottomSeconds: number | null;
  tempoConcentricSeconds: number | null;
  tempoPauseTopSeconds: number | null;
  restSeconds: number | null;
  assistanceType: string | null;
  assistanceAmount: string | null;
  romMinDegrees: number | null;
  romMaxDegrees: number | null;
  painLimit: number | null;
  notes: string | null;
};

export type RehabPlanExerciseView = {
  id: string;
  rehabExerciseDefinitionId: string | null;
  userRehabExerciseId: string | null;
  exerciseName: string;
  displayOrder: number;
  side: RehabSide;
  instructionsSnapshot: string;
  stopConditionsSnapshot: string;
  prescriptions: RehabPrescriptionView[];
};

export type RehabPlanDayView = {
  id: string;
  name: string;
  dayIndex: number;
  description: string | null;
  estimatedDurationMinutes: number | null;
  exercises: RehabPlanExerciseView[];
};

export type RehabPlanPhaseView = {
  id: string;
  name: string;
  phaseType: RehabPhaseType;
  displayOrder: number;
  startDate: string | null;
  endDate: string | null;
  clinicianNotes: string | null;
  days: RehabPlanDayView[];
};

export type RehabRestrictionView = {
  id: string;
  restrictionType: RehabRestrictionType;
  bodyAreaId: string | null;
  side: RehabSide;
  valueText: string;
  numericMin: number | null;
  numericMax: number | null;
  unit: string | null;
  severity: RehabRestrictionSeverity;
  source: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  active: boolean;
  displayOrder: number;
};

export type RehabClinicianSourceView = {
  id: string;
  sourceType: RehabClinicianSourceType;
  clinicianName: string | null;
  clinicName: string | null;
  documentTitle: string | null;
  documentDate: string | null;
  notes: string | null;
  confirmedByUser: boolean;
};

export type RehabPlanSummaryView = {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  side: RehabSide;
  bodyAreaId: string | null;
  clinicianSourceId: string | null;
  active: boolean;
  version: number;
  phases: RehabPlanPhaseView[];
  restrictions: RehabRestrictionView[];
};

export type RehabPerformedSetView = {
  id: string;
  setIndex: number;
  status: RehabSetStatus;
  side: RehabSide;
  reps: number | null;
  durationSeconds: number | null;
  holdSeconds: number | null;
  load: number | null;
  loadUnit: string | null;
  assistanceType: string | null;
  assistanceAmount: string | null;
  romAchieved: number | null;
  painBefore: number | null;
  painDuring: number | null;
  painAfter: number | null;
  swelling: RehabSwellingLevel | null;
  instability: RehabInstabilityLevel | null;
  confidence: number | null;
  notes: string | null;
  painLimit: number | null;
};

export type RehabSessionExerciseView = {
  id: string;
  sourceExerciseId: string | null;
  exerciseName: string;
  side: RehabSide;
  exerciseOrder: number;
  instructionsSnapshot: string;
  stopConditionsSnapshot: string;
  notes: string | null;
  sets: RehabPerformedSetView[];
};

export type RehabAlertView = {
  id: string;
  alertType: RehabAlertType;
  severity: RehabRestrictionSeverity;
  messageSnapshot: string;
  rehabSetId: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
};

export type RehabObservationView = {
  id: string;
  observationType: RehabObservationType;
  valueNumeric: number | null;
  valueText: string | null;
  side: RehabSide;
  bodyArea: string | null;
  recordedAt: string;
};

export type RehabSessionView = {
  id: string;
  title: string;
  status: RehabSessionStatus;
  version: number;
  side: RehabSide;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  sourcePlanId: string | null;
  sourcePlanDayId: string | null;
  sourcePlanVersion: number | null;
  scheduledRehabSessionId: string | null;
  dailyRecordId: string;
  clinicianSourceSnapshot: RehabClinicianSourceView | null;
  restrictions: RehabRestrictionView[];
  alerts: RehabAlertView[];
  observations: RehabObservationView[];
  unacknowledgedAlertCount: number;
  progressionPaused: boolean;
  exercises: RehabSessionExerciseView[];
};

export type RehabPreviousPerformanceView = {
  setIndex: number;
  reps: number | null;
  durationSeconds: number | null;
  holdSeconds: number | null;
  assistanceType: string | null;
  assistanceAmount: string | null;
  romAchieved: number | null;
  painBefore: number | null;
  painDuring: number | null;
  painAfter: number | null;
  swelling: RehabSwellingLevel | null;
  instability: RehabInstabilityLevel | null;
  confidence: number | null;
  notes: string | null;
  completedAt: string | null;
};

export type RehabSessionSummaryView = {
  sessionId: string;
  title: string;
  localDate: string;
  planName: string | null;
  phaseName: string | null;
  exercises: RehabSessionExerciseView[];
  alerts: RehabAlertView[];
  observations: RehabObservationView[];
  averageConfidence: number | null;
  painTrendLabel: string | null;
};

export type RehabSessionStartOptionsView = {
  scheduled: {
    id: string;
    title: string;
    localDate: string;
    status: string;
  } | null;
  activeSession: { id: string; title: string } | null;
  lastCompleted: { id: string; title: string; completedAt: string } | null;
};
