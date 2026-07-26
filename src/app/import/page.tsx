import type { Metadata } from "next";
import { PlannedRouteShell } from "@/widgets/navigation/planned-route-shell";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <PlannedRouteShell
      title="AI Import"
      summary="Propose → human review → draft template. Provenance required. No silent promotion of AI macros or workout plans."
    />
  );
}
