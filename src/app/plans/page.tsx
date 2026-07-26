import type { Metadata } from "next";
import { PlannedRouteShell } from "@/widgets/navigation/planned-route-shell";

export const metadata: Metadata = { title: "Plans" };

export default function PlansPage() {
  return (
    <PlannedRouteShell
      title="Plans"
      summary="Templates and routines live here — separate from performed sessions and meal logs. Workout and meal plan editors arrive in later increments."
    />
  );
}
