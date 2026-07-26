import type { Metadata } from "next";
import { PlannedRouteShell } from "@/widgets/navigation/planned-route-shell";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <PlannedRouteShell
      title="Calendar"
      summary="Day grid with compact completion icons and planned-versus-completed states. Selecting a date will load that day’s board. Not a social activity feed."
    />
  );
}
