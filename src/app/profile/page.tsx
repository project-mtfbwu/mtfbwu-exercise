import type { Metadata } from "next";
import { PlannedRouteShell } from "@/widgets/navigation/planned-route-shell";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PlannedRouteShell
      title="Profile"
      summary="Units, enabled modules, motion preference (full / reduced / off), and privacy controls. Visual cue: 11-profile-board.png.png."
    />
  );
}
