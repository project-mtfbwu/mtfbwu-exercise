import type { Metadata } from "next";
import { PlannedRouteShell } from "@/widgets/navigation/planned-route-shell";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PlannedRouteShell
      title="Settings"
      summary="App preferences, motion override, export/delete (later), and developer diagnostics. No domain CRUD here."
    />
  );
}
