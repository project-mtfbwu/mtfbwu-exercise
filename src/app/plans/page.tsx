import type { Metadata } from "next";
import { listPlansAction } from "@/modules/workout/sessions/actions";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { PlansClient } from "@/widgets/plans/plans-client";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const { profile } = await loadProfileOrRedirect();
  const plans = await listPlansAction();

  return <PlansClient initialPlans={plans} timezone={profile.timezone || "UTC"} />;
}
