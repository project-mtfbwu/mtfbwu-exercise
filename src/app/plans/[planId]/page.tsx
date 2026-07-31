import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlanAction } from "@/modules/workout/plans/actions";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { PlanEditorClient } from "@/widgets/plans/plan-editor-client";

export const metadata: Metadata = { title: "Edit plan" };

export default async function PlanEditorPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  await loadProfileOrRedirect();
  const plan = await getPlanAction(planId);
  if (!plan) notFound();

  return <PlanEditorClient initialPlan={plan} />;
}
