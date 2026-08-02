import type { Metadata } from "next";
import { loadProfileOrRedirect } from "@/shared/board/load-board";
import { SignOutButton } from "@/widgets/auth/sign-out-button";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";
import { getProgressSummaryCountsAction } from "@/modules/measurements/actions";
import {
  loadProfilePreferencesAction,
  loadProfileTotalsAction,
  loadDailyOverviewPreferencesAction,
} from "@/modules/profile/actions";
import {
  listTrackerRemindersAction,
  listUserTrackersAction,
} from "@/modules/trackers/actions";
import { listUserSupplementsAction } from "@/modules/supplements/actions";
import { ProfileSettingsClient } from "@/widgets/profile/profile-settings-client";
import { ReminderPreferencesClient } from "@/widgets/profile/reminder-preferences-client";
import { PROGRESS_DATA_DISCLAIMER } from "@/modules/progress-photos/safety";
import { SUPPLEMENT_SAFETY_COPY } from "@/modules/supplements/safety";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile, user } = await loadProfileOrRedirect();
  const [progressCounts, totals, prefs, overviewPrefs, reminders, trackers, supplements] =
    await Promise.all([
      getProgressSummaryCountsAction(),
      loadProfileTotalsAction(),
      loadProfilePreferencesAction(),
      loadDailyOverviewPreferencesAction(),
      listTrackerRemindersAction(),
      listUserTrackersAction(),
      listUserSupplementsAction(),
    ]);

  return (
    <article className="mx-auto max-w-2xl space-y-4 py-4">
      <SyncStatusBanner />
      <RetroWindow title="Profile" accent="pink">
        <PaperCard>
          <dl className="space-y-2 text-sm text-[var(--mt-ink)]">
            <div>
              <dt className="font-bold">Display name</dt>
              <dd>{profile.display_name || prefs?.preferredName || "—"}</dd>
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
            <div>
              <dt className="font-bold">Week starts</dt>
              <dd>{prefs?.weekStartsOn ?? 1} (0=Sun)</dd>
            </div>
            <div>
              <dt className="font-bold">Time format</dt>
              <dd>{prefs?.timeFormat ?? "24h"}</dd>
            </div>
            <div>
              <dt className="font-bold">Private totals (your data only)</dt>
              <dd>
                {totals.nutritionDays} meals · {totals.workoutSessions} workouts ·{" "}
                {totals.rehabSessions} rehab · {totals.weightEntries} weights ·{" "}
                {totals.photoSets} photo sets · {totals.hydrationEntries} hydration ·{" "}
                {totals.meditationSessions} meditation · {totals.sleepSessions} sleep ·{" "}
                {totals.supplementIntakes} supplement marks · {totals.trackerEvents}{" "}
                tracker events
              </dd>
            </div>
            <div>
              <dt className="font-bold">Progress (Increment 8)</dt>
              <dd>
                {progressCounts.weightCount} weight · {progressCounts.measurementCount}{" "}
                measurement sets · {progressCounts.photoSetCount} photo sets
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--mt-ink-muted)]">
            {PROGRESS_DATA_DISCLAIMER}
          </p>
          <p className="mt-1 text-xs text-[var(--mt-ink-muted)]">
            {SUPPLEMENT_SAFETY_COPY.disclaimer}
          </p>
          <p className="mt-1 text-xs text-[var(--mt-ink-muted)]">
            Reminders: schedules save now; push/email delivery arrives in a later release.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <AppLink href={ROUTES.customize}>Customize board</AppLink>
            <AppLink href={ROUTES.progress}>Progress</AppLink>
            <AppLink href={ROUTES.calendar}>Calendar</AppLink>
            <AppLink href={ROUTES.history}>History</AppLink>
            <AppLink href={ROUTES.settings}>Settings</AppLink>
            <AppLink href={ROUTES.forgotPassword}>Password reset</AppLink>
            <SignOutButton />
          </div>
          <ProfileSettingsClient
            userId={user.id}
            profile={profile}
            initialPrefs={prefs}
            initialOverviewPrefs={overviewPrefs}
          />
          <ReminderPreferencesClient
            userId={user.id}
            timezone={profile.timezone}
            initialReminders={reminders}
            trackers={trackers.filter((t) => t.enabled && !t.archivedAt)}
            supplements={supplements.filter((s) => s.active)}
          />
        </PaperCard>
      </RetroWindow>
    </article>
  );
}
