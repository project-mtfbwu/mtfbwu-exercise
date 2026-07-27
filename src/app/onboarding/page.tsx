import type { Metadata } from "next";
import { requireUser } from "@/shared/board/load-board";
import { OnboardingWizard } from "@/widgets/onboarding/onboarding-wizard";
import { redirect } from "next/navigation";
import { ROUTES } from "@/shared/config/constants";

export const metadata: Metadata = { title: "Onboarding" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();
  await supabase.rpc("ensure_user_board_defaults", { p_user_id: user.id });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect(ROUTES.today);
  }

  const { data: modules } = await supabase
    .from("module_definitions")
    .select("key, display_name, description, default_enabled, category")
    .eq("is_active", true)
    .order("default_order", { ascending: true });

  return (
    <OnboardingWizard
      modules={modules ?? []}
      initialDisplayName={profile?.display_name ?? ""}
    />
  );
}
