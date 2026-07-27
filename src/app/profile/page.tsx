import type { Metadata } from "next";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { SignOutButton } from "@/widgets/auth/sign-out-button";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile, user } = await loadProfileOrRedirect();

  return (
    <article className="mx-auto max-w-2xl space-y-4 py-4">
      <SyncStatusBanner />
      <RetroWindow title="Profile" accent="pink">
        <PaperCard>
          <dl className="space-y-2 text-sm text-[var(--mt-ink)]">
            <div>
              <dt className="font-bold">Display name</dt>
              <dd>{profile.display_name || "—"}</dd>
            </div>
            <div>
              <dt className="font-bold">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt className="font-bold">Timezone</dt>
              <dd>{profile.timezone}</dd>
            </div>
            <div>
              <dt className="font-bold">Units</dt>
              <dd>{profile.units_system}</dd>
            </div>
            <div>
              <dt className="font-bold">Motion</dt>
              <dd>{profile.animation_mode}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--mt-ink-muted)]">
            Medical details and deep privacy controls arrive later. Customize modules on
            the board screen.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AppLink href={ROUTES.customize}>Customize board</AppLink>
            <AppLink href={ROUTES.settings}>Settings</AppLink>
            <SignOutButton />
          </div>
        </PaperCard>
      </RetroWindow>
    </article>
  );
}
