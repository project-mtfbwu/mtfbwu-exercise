import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadSummaryAction } from "@/modules/rehab/sessions/actions";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { TRACKING_DISCLAIMER } from "@/modules/rehab/safety";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";

export const metadata: Metadata = { title: "Rehab session summary" };

type Props = { params: Promise<{ sessionId: string }> };

export default async function RehabSessionSummaryPage({ params }: Props) {
  await loadProfileOrRedirect();
  const { sessionId } = await params;
  const result = await loadSummaryAction({ sessionId });
  if (!result.ok) notFound();
  const summary = result.summary;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <AppLink href={ROUTES.today} className="text-sm underline">
        ← Today
      </AppLink>
      <header>
        <h1 className="text-2xl font-black text-[var(--mt-ink-inverse)]">
          {summary.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--mt-ink-muted)]">{TRACKING_DISCLAIMER}</p>
        <p className="text-sm text-[var(--mt-ink-muted)]">
          {summary.localDate}
          {summary.planName ? ` · ${summary.planName}` : ""}
          {summary.phaseName ? ` · ${summary.phaseName}` : ""}
        </p>
      </header>
      {summary.painTrendLabel ? (
        <p className="rounded bg-[var(--mt-paper)] p-3 text-sm">
          {summary.painTrendLabel}
        </p>
      ) : null}
      {summary.averageConfidence != null ? (
        <p className="text-sm">Average confidence: {summary.averageConfidence}</p>
      ) : null}
      <section className="space-y-4">
        {summary.exercises.map((exercise) => (
          <article key={exercise.id} className="rounded border bg-[var(--mt-paper)] p-4">
            <h2 className="font-bold">{exercise.exerciseName}</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {exercise.sets.map((set) => (
                <li key={set.id}>
                  Set {set.setIndex}: {set.status}
                  {set.painAfter != null ? ` · pain after ${set.painAfter}` : ""}
                  {set.confidence != null ? ` · confidence ${set.confidence}` : ""}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      {summary.alerts.length > 0 ? (
        <section>
          <h2 className="font-bold">Alerts</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.alerts.map((alert) => (
              <li key={alert.id}>{alert.messageSnapshot}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {summary.observations.length > 0 ? (
        <section>
          <h2 className="font-bold">Observations</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.observations.map((obs) => (
              <li key={obs.id}>
                {obs.observationType.replace(/_/g, " ")}
                {obs.valueNumeric != null ? ` · ${obs.valueNumeric}` : ""}
                {obs.valueText ? ` · ${obs.valueText}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
