import type { Metadata } from "next";
import { PlannedRouteShell } from "@/widgets/navigation/planned-route-shell";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <PlannedRouteShell
      title="Progress"
      summary="Measurements and private progress photos will surface here. Photos stay in private Storage with RLS — never a public gallery."
    />
  );
}
