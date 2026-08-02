import { SUPPLEMENT_CHECKLIST_COPY } from "@/modules/supplements/safety";
import type { SupplementDaySummary } from "@/modules/supplements/types";

export function supplementStatusLabel(summary: SupplementDaySummary): string {
  if (summary.totalActive === 0) return "Supplements · none configured";
  if (summary.intakes.length === 0) return SUPPLEMENT_CHECKLIST_COPY.empty;
  const marked = summary.takenCount + summary.skippedCount;
  if (marked >= summary.totalActive) return SUPPLEMENT_CHECKLIST_COPY.allDone;
  return SUPPLEMENT_CHECKLIST_COPY.progress(marked, summary.totalActive);
}

export function supplementChecklistForDate(summary: SupplementDaySummary): {
  supplementId: string;
  displayName: string;
  status: "pending" | "taken" | "skipped" | "partial";
}[] {
  const intakeBySupplement = new Map(summary.intakes.map((i) => [i.userSupplementId, i]));
  return summary.activeSupplements.map((s) => {
    const intake = intakeBySupplement.get(s.id);
    if (!intake)
      return {
        supplementId: s.id,
        displayName: s.displayName,
        status: "pending" as const,
      };
    return {
      supplementId: s.id,
      displayName: s.displayName,
      status: intake.status,
    };
  });
}
