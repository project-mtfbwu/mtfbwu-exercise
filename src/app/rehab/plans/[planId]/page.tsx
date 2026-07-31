import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlanAction } from "@/modules/rehab/plans/actions";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { RehabPlanEditorClient } from "@/widgets/rehab-plans/rehab-plan-editor-client";

export const metadata: Metadata = { title: "Rehab plan" };

type Props = { params: Promise<{ planId: string }> };

export default async function RehabPlanPage({ params }: Props) {
  await loadProfileOrRedirect();
  const { planId } = await params;
  const plan = await getPlanAction({ planId });
  if (!plan) notFound();
  return <RehabPlanEditorClient initialPlan={plan} />;
}
