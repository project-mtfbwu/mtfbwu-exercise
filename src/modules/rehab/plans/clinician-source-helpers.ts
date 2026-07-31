import type { RehabClinicianSourceView } from "@/modules/rehab/types";

/** Shown near clinician-source fields — provenance is not credential verification. */
export const CLINICIAN_PROVENANCE_WARNING =
  "Recording a clinician or document here tracks where instructions came from. It does not verify credentials, accuracy, or that a clinician reviewed this app.";

/** Label when the user has not marked the source as confirmed. */
export function clinicianSourceUnconfirmedLabel(
  source: Pick<RehabClinicianSourceView, "confirmedByUser">,
): string | null {
  if (source.confirmedByUser) return null;
  return "Unconfirmed — entered by you, not verified by a clinician";
}
