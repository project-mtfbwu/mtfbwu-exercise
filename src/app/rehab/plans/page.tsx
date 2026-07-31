import type { Metadata } from "next";
import { listPlansAction } from "@/modules/rehab/plans/actions";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { RehabPlansClient } from "@/widgets/rehab-plans/rehab-plans-client";

export const metadata: Metadata = { title: "Rehab plans" };

export default async function RehabPlansPage() {
  await loadProfileOrRedirect();
  const plans = await listPlansAction();
  return <RehabPlansClient initialPlans={plans} />;
}
