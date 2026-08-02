"use client";

import { useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  saveDailyOverviewPreferencesAction,
  saveProfilePreferencesAction,
  updateProfileSettingsAction,
  type DailyOverviewPreferencesView,
  type ProfilePreferencesView,
} from "@/modules/profile/actions";
import type { AnimationMode, Profile, UnitsSystem } from "@/shared/database/types";
import { useOnlineStore } from "@/shared/offline/online-store";
import {
  buildProfilePreferenceWrites,
  buildProfileSettingsWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

type Props = {
  userId: string;
  profile: Profile;
  initialPrefs: ProfilePreferencesView | null;
  initialOverviewPrefs: DailyOverviewPreferencesView | null;
};

export function ProfileSettingsClient({
  userId,
  profile,
  initialPrefs,
  initialOverviewPrefs,
}: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [timezone, setTimezone] = useState(profile.timezone);
  const [unitsSystem, setUnitsSystem] = useState<UnitsSystem>(profile.units_system);
  const [animationMode, setAnimationMode] = useState<AnimationMode>(
    profile.animation_mode,
  );
  const [preferredName, setPreferredName] = useState(initialPrefs?.preferredName ?? "");
  const [weekStartsOn, setWeekStartsOn] = useState(initialPrefs?.weekStartsOn ?? 1);
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">(
    initialPrefs?.timeFormat ?? "24h",
  );
  const [showStreaks, setShowStreaks] = useState(initialPrefs?.showStreaks ?? true);
  const [showWeeklySummary, setShowWeeklySummary] = useState(
    initialPrefs?.showWeeklySummary ?? true,
  );
  const [showCompletion, setShowCompletion] = useState(
    initialOverviewPrefs?.showCompletionPercentage ?? true,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnlineStore((s) => s.status) !== "offline";
  const timezoneChanged = timezone !== profile.timezone;

  function saveAll() {
    setError(null);
    startTransition(async () => {
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.profilePreference,
          entityId: userId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.profilePreference,
            writes: [
              ...buildProfileSettingsWrites({
                userId,
                displayName,
                timezone,
                unitsSystem,
                animationMode,
              }),
              ...buildProfilePreferenceWrites({
                userId,
                preferredName: preferredName || null,
                weekStartsOn,
                timeFormat,
                showStreaks,
                showWeeklySummary,
              }),
            ],
          },
          profilePreferenceDraft: {
            payload: {
              displayName,
              timezone,
              unitsSystem,
              animationMode,
              preferredName,
              weekStartsOn,
              timeFormat,
              showStreaks,
              showWeeklySummary,
            },
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setMessage("Preferences queued offline — sync when connected.");
        return;
      }

      const profileResult = await updateProfileSettingsAction({
        displayName,
        timezone,
        unitsSystem,
        animationMode,
      });
      if (!profileResult.ok) {
        setError(profileResult.error);
        return;
      }

      const prefsResult = await saveProfilePreferencesAction({
        preferredName: preferredName || undefined,
        weekStartsOn,
        timeFormat,
        showStreaks,
        showWeeklySummary,
      });
      if (!prefsResult.ok) {
        setError(prefsResult.error);
        return;
      }

      const overviewResult = await saveDailyOverviewPreferencesAction({
        showCompletionPercentage: showCompletion,
      });
      if (!overviewResult.ok) {
        setError(overviewResult.error);
        return;
      }

      setMessage("Profile and preferences saved.");
    });
  }

  return (
    <div className="mt-4 space-y-4 border-t-2 border-[var(--mt-ink)] pt-4">
      <h2 className="text-lg font-black uppercase">Edit profile</h2>
      {!online ? (
        <p role="status" className="text-sm text-[var(--mt-ink-muted)]">
          Offline — changes queue locally until sync.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="font-bold text-[var(--mt-success)]">
          {message}
        </p>
      ) : null}
      <label className="block text-sm font-bold">
        Display name
        <input
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>
      <label className="block text-sm font-bold">
        Preferred name
        <input
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
        />
      </label>
      <label className="block text-sm font-bold">
        Timezone
        <input
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
      </label>
      {timezoneChanged ? (
        <p className="text-xs text-[var(--mt-ink-muted)]">
          Timezone change affects future display only; historical local dates unchanged.
        </p>
      ) : null}
      <label className="block text-sm font-bold">
        Units
        <select
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={unitsSystem}
          onChange={(e) => setUnitsSystem(e.target.value as UnitsSystem)}
        >
          <option value="metric">metric</option>
          <option value="imperial">imperial</option>
        </select>
      </label>
      <label className="block text-sm font-bold">
        Motion
        <select
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={animationMode}
          onChange={(e) => setAnimationMode(e.target.value as AnimationMode)}
        >
          <option value="full">full</option>
          <option value="reduced">reduced</option>
          <option value="off">off</option>
        </select>
      </label>
      <label className="block text-sm font-bold">
        Week starts on (0=Sun)
        <input
          type="number"
          min={0}
          max={6}
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={weekStartsOn}
          onChange={(e) => setWeekStartsOn(Number(e.target.value))}
        />
      </label>
      <label className="block text-sm font-bold">
        Time format
        <select
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={timeFormat}
          onChange={(e) => setTimeFormat(e.target.value as "12h" | "24h")}
        >
          <option value="24h">24h</option>
          <option value="12h">12h</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={showStreaks}
          onChange={(e) => setShowStreaks(e.target.checked)}
        />
        Show streaks
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={showWeeklySummary}
          onChange={(e) => setShowWeeklySummary(e.target.checked)}
        />
        Show weekly summary
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={showCompletion}
          onChange={(e) => setShowCompletion(e.target.checked)}
        />
        Show completion percentage on calendar/history
      </label>
      <PixelButton tone="primary" loading={pending} onClick={saveAll}>
        Save profile settings
      </PixelButton>
    </div>
  );
}
