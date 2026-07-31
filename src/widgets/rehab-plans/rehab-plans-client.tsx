"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES, rehabPlanRoute } from "@/shared/config/constants";
import { createPlanAction, listPlansAction } from "@/modules/rehab/plans/actions";
import type { RehabPlanSummaryView } from "@/modules/rehab/types";
import { SAFETY_BANNER } from "@/modules/rehab/safety";

export function RehabPlansClient({
  initialPlans,
}: {
  initialPlans: RehabPlanSummaryView[];
}) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [newPlanName, setNewPlanName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function createPlan() {
    const name = newPlanName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createPlanAction({ name });
      if (!result.ok) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(result.message);
      setNewPlanName("");
      setPlans(await listPlansAction());
      router.push(rehabPlanRoute(result.id));
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header>
        <AppLink href={ROUTES.today} className="text-sm underline">
          ← Today
        </AppLink>
        <h1 className="mt-2 text-2xl font-black text-[var(--mt-ink-inverse)]">
          Rehab plans
        </h1>
        <p className="mt-2 rounded border border-[var(--mt-ink-muted)]/30 bg-[var(--mt-paper)] px-3 py-2 text-sm text-[var(--mt-ink)]">
          {SAFETY_BANNER}
        </p>
      </header>

      <section className="rounded border-2 border-[var(--mt-ink)] bg-[var(--mt-paper)] p-4">
        <h2 className="font-bold">Create plan</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="new-rehab-plan-name">
            Plan name
          </label>
          <input
            id="new-rehab-plan-name"
            className="min-h-11 flex-1 border-2 border-[var(--mt-ink)] px-2"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            placeholder="Plan name"
          />
          <PixelButton tone="primary" onClick={createPlan} disabled={pending}>
            Create
          </PixelButton>
        </div>
      </section>

      {message ? <p className="text-sm text-[var(--mt-neon-lime)]">{message}</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-[var(--mt-neon-pink)]">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="rounded border-2 border-[var(--mt-ink)] bg-[var(--mt-paper)] p-4"
          >
            <AppLink href={rehabPlanRoute(plan.id)} className="font-bold underline">
              {plan.name}
            </AppLink>
            <p className="text-sm text-[var(--mt-ink-muted)]">
              v{plan.version} · {plan.phases.length} phase
              {plan.phases.length === 1 ? "" : "s"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
