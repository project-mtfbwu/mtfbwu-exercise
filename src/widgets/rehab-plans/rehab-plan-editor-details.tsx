"use client";

import type {
  RehabClinicianSourceView,
  RehabPlanSummaryView,
  RehabRestrictionView,
} from "@/modules/rehab/types";

function restrictionHeading(type: RehabRestrictionView["restrictionType"]): string {
  if (type === "clinician_instruction") return "Clinician instructions";
  if (type === "stop_condition") return "Stop conditions";
  return "Restriction";
}

export function RehabPlanEditorDetails({
  plan,
  clinicianSource,
  unconfirmedLabel,
  onSaveName,
  disabled,
}: {
  plan: RehabPlanSummaryView;
  clinicianSource?: RehabClinicianSourceView | null;
  unconfirmedLabel?: string | null;
  onSaveName: (name: string) => void;
  disabled?: boolean;
}) {
  const clinicianInstructions = plan.restrictions.filter(
    (r) => r.restrictionType === "clinician_instruction" && r.active,
  );
  const stopConditions = plan.restrictions.filter(
    (r) => r.restrictionType === "stop_condition" && r.active,
  );
  const otherRestrictions = plan.restrictions.filter(
    (r) =>
      r.active &&
      r.restrictionType !== "clinician_instruction" &&
      r.restrictionType !== "stop_condition",
  );
  const phaseNotes = plan.phases
    .map((phase) => ({ phase: phase.name, notes: phase.clinicianNotes }))
    .filter((entry) => entry.notes?.trim());

  return (
    <header className="space-y-4">
      <div>
        <label className="block text-sm font-medium" htmlFor="rehab-plan-name">
          Plan name
        </label>
        <input
          id="rehab-plan-name"
          className="mt-1 min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
          defaultValue={plan.name}
          disabled={disabled}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next && next !== plan.name) onSaveName(next);
          }}
        />
        <p className="mt-1 text-sm text-[var(--mt-ink-muted)]">Version {plan.version}</p>
      </div>

      {(clinicianSource || clinicianInstructions.length > 0 || phaseNotes.length > 0) && (
        <section
          className="rounded border-2 border-[var(--mt-neon-pink)] bg-[var(--mt-paper)] p-4"
          aria-labelledby="rehab-clinician-heading"
        >
          <h2
            id="rehab-clinician-heading"
            className="text-base font-bold text-[var(--mt-neon-pink)]"
          >
            Clinician instructions
          </h2>
          {clinicianSource ? (
            <p className="mt-2 text-sm">
              {[
                clinicianSource.clinicianName,
                clinicianSource.clinicName,
                clinicianSource.documentTitle,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          {unconfirmedLabel ? (
            <p className="mt-2 text-sm text-[var(--mt-neon-pink)]">{unconfirmedLabel}</p>
          ) : null}
          {clinicianSource?.notes ? (
            <p className="mt-2 text-sm font-medium whitespace-pre-wrap">
              {clinicianSource.notes}
            </p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {clinicianInstructions.map((r) => (
              <li key={r.id} className="text-sm font-medium whitespace-pre-wrap">
                {r.valueText}
              </li>
            ))}
            {phaseNotes.map((entry) => (
              <li key={entry.phase} className="text-sm">
                <span className="font-bold">{entry.phase}:</span> {entry.notes}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(stopConditions.length > 0 || otherRestrictions.length > 0) && (
        <section
          className="rounded border-2 border-[var(--mt-ink)] bg-[var(--mt-paper)] p-4"
          aria-labelledby="rehab-restrictions-heading"
        >
          <h2 id="rehab-restrictions-heading" className="text-base font-bold">
            Original restriction wording
          </h2>
          <ul className="mt-3 space-y-3">
            {[...stopConditions, ...otherRestrictions].map((r) => (
              <li
                key={r.id}
                className="rounded border border-[var(--mt-ink-muted)]/40 p-3"
              >
                <p className="text-xs tracking-wide text-[var(--mt-ink-muted)] uppercase">
                  {restrictionHeading(r.restrictionType)}
                  {r.severity === "stop" ? " · STOP" : ""}
                </p>
                <p className="mt-1 text-sm font-medium whitespace-pre-wrap">
                  {r.valueText}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </header>
  );
}
