/** Neutral safety copy — no medical claims, no dosage advice. */
export const SUPPLEMENT_SAFETY_COPY = {
  disclaimer:
    "Supplement logging is for personal tracking only. MTFBWU does not provide medical advice.",
  notDosageAdvice:
    "Recorded amounts are notes you choose to keep — not recommendations or prescriptions.",
  skippedLabel: "Skipped",
  takenLabel: "Taken",
  partialLabel: "Partial",
  reminderDeferred:
    "Reminder delivery is coming later. Your schedule is saved and will apply when notifications ship.",
} as const;

export const SUPPLEMENT_CHECKLIST_COPY = {
  empty: "No supplements configured for today.",
  allDone: "All supplements marked for today.",
  progress: (done: number, total: number) => `${done} of ${total} marked today`,
} as const;
