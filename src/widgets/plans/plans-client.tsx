"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { createPlanAction } from "@/modules/workout/plans/actions";
import {
  installArnoldStarterPlanAction,
  listPlansAction,
  schedulePlanDayAction,
} from "@/modules/workout/sessions/actions";
import type { PlanSummaryView } from "@/modules/workout/sessions/types";
import { todayLocalDate } from "@/shared/utils/local-date";

export function PlansClient({
  initialPlans,
  timezone,
}: {
  initialPlans: PlanSummaryView[];
  timezone: string;
}) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [newPlanName, setNewPlanName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = todayLocalDate(timezone);

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
      router.push(`/plans/${result.id}`);
      router.refresh();
    });
  }

  function installArnold() {
    startTransition(async () => {
      const result = await installArnoldStarterPlanAction();
      if (!result.ok) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(result.message);
      setPlans(await listPlansAction());
      router.refresh();
    });
  }

  function scheduleDay(planDayId: string, dayName: string) {
    startTransition(async () => {
      const result = await schedulePlanDayAction({
        planDayId,
        localDate: today,
        timezone,
      });
      if (!result.ok) {
        setError(result.error);
        setMessage(null);
        return;
      }
      setError(null);
      setMessage(
        `"${dayName}" scheduled for ${today}. Open Workout on Today to start it.`,
      );
    });
  }

  return (
    <article className="mt-paper-panel space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-[var(--mt-neon-purple)] uppercase">
          Training templates
        </p>
        <h1 className="text-3xl font-bold text-[var(--mt-ink)]">Plans</h1>
      </header>
      <p className="max-w-prose text-sm font-bold text-[var(--mt-ink-muted)]">
        Plans are templates — performed sessions are logged separately on Today. Schedule
        a day to your board, then start the live session from the Workout focus panel.
      </p>
      {message ? (
        <p
          role="status"
          className="border-2 border-[var(--mt-neon-lime)] bg-white p-2 text-sm font-bold"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="border-2 border-[var(--mt-danger)] bg-white p-2 text-sm font-bold text-[var(--mt-danger)]"
        >
          {error}
        </p>
      ) : null}
      <div className="border-2 border-[var(--mt-ink)] bg-white/80 p-3">
        <h2 className="text-sm font-black uppercase">Create a plan</h2>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-sm font-bold" htmlFor="new-plan-name">
            Plan name
            <input
              id="new-plan-name"
              value={newPlanName}
              maxLength={120}
              onChange={(event) => setNewPlanName(event.target.value)}
              placeholder="Push / pull / legs…"
              className="mt-1 block min-h-11 w-56 border-2 border-[var(--mt-ink)] px-2"
            />
          </label>
          <PixelButton
            tone="primary"
            loading={pending}
            disabled={!newPlanName.trim()}
            onClick={createPlan}
          >
            Create plan
          </PixelButton>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PixelButton tone="neutral" loading={pending} onClick={installArnold}>
          Install Arnold starter plan
        </PixelButton>
        <AppLink
          href={ROUTES.today}
          className="inline-flex min-h-11 items-center border-2 border-[var(--mt-neon-cyan)] bg-[var(--mt-neon-cyan)] px-3 text-sm font-extrabold text-[var(--mt-ink)] no-underline"
        >
          Open Today to start a session
        </AppLink>
      </div>
      {plans.length === 0 ? (
        <p className="border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-3 text-sm">
          No workout plans yet. Install the Arnold starter above, then review blocks
          before your first session.
        </p>
      ) : (
        <ul className="space-y-4">
          {plans.map((plan) => (
            <li key={plan.id} className="border-2 border-[var(--mt-ink)] bg-white/80 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-black uppercase">{plan.name}</h2>
                <AppLink
                  href={`/plans/${plan.id}`}
                  className="inline-flex min-h-11 items-center border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-cyan)] px-3 text-sm font-extrabold text-[var(--mt-ink)] no-underline"
                >
                  Edit plan
                </AppLink>
              </div>
              {plan.description ? (
                <p className="mt-1 text-sm text-[var(--mt-ink-muted)]">
                  {plan.description}
                </p>
              ) : null}
              <ul className="mt-3 space-y-2">
                {plan.days.map((day) => (
                  <li
                    key={day.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mt-ink)]/30 pt-2 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <strong>{day.name}</strong>
                      {day.restDay ? (
                        <span className="ml-2 text-xs font-bold uppercase">Rest day</span>
                      ) : (
                        <span className="ml-2 text-xs">
                          {day.blocks.length} block{day.blocks.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    {!day.restDay && day.blocks.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <PixelButton
                          tone="cyan"
                          loading={pending}
                          onClick={() => scheduleDay(day.id, day.name)}
                        >
                          Schedule for today
                        </PixelButton>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
