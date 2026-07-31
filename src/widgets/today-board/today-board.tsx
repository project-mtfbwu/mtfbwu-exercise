"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMotionPreference } from "@/shared/providers/motion-provider";
import { FlatLayBoard, boardLayoutStyles } from "@/widgets/flat-lay-board";
import { FlatLayCard } from "@/shared/ui/flat-lay/flat-lay-card";
import { ScreenReaderStatus } from "@/shared/ui/screen-reader-status";
import { FocusLayer } from "@/widgets/focus-layer/focus-layer";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { StickerBadge } from "@/shared/ui/flat-lay/sticker-badge";
import { MotionDevToggle } from "@/widgets/today-board/motion-dev-toggle";
import type { BoardSnapshot } from "@/shared/board/board-model";
import { variantToFlatLay } from "@/shared/board/board-model";
import { updateDailyStatusAction } from "@/shared/board/actions";
import {
  shiftLocalDate,
  todayLocalDate,
  compareLocalDates,
} from "@/shared/utils/local-date";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { cn } from "@/shared/utils/cn";
import { MealFocus } from "@/widgets/today-board/focus/meal-focus";
import { WorkoutFocus } from "@/widgets/today-board/focus/workout-focus";
import { RehabFocus } from "@/widgets/today-board/focus/rehab-focus";
import { WaterFocus } from "@/widgets/today-board/focus/water-focus";
import { MeditationFocus } from "@/widgets/today-board/focus/meditation-focus";
import { MeasurementsFocus } from "@/widgets/today-board/focus/measurements-focus";
import { ProfileFocus } from "@/widgets/today-board/focus/profile-focus";
import { createInitialDemoState } from "@/widgets/today-board/demo-state";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";
import { BOARD_ENTITY, queueBoardMutation } from "@/shared/offline/board-outbox";
import { useOnlineStore } from "@/shared/offline/online-store";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

type Props = {
  snapshot: BoardSnapshot;
};

export function TodayBoard({ snapshot }: Props) {
  const router = useRouter();
  const { resolution } = useMotionPreference();
  const motionPreference = resolution.preference;
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [demo] = useState(() => createInitialDemoState());
  const [cards, setCards] = useState(snapshot.cards);
  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";
  const today = todayLocalDate(snapshot.profile.timezone);
  const atToday = compareLocalDates(snapshot.localDate, today) >= 0;

  const openCard = cards.find((c) => c.card.id === openCardId) ?? null;

  const targetMetrics = useMemo(
    () => [
      {
        label: "Modules enabled",
        value: cards.length,
        max: Math.max(cards.length, 1),
        unit: "",
        tone: "lime" as const,
      },
      {
        label: "Completed today",
        value: cards.filter((c) => c.status?.status === "completed").length,
        max: Math.max(cards.length, 1),
        unit: "",
        tone: "pink" as const,
      },
      {
        label: "In progress",
        value: cards.filter((c) => c.status?.status === "in_progress").length,
        max: Math.max(cards.length, 1),
        unit: "",
        tone: "cyan" as const,
      },
    ],
    [cards],
  );

  function goDate(delta: number) {
    const next = shiftLocalDate(snapshot.localDate, delta);
    if (compareLocalDates(next, today) > 0) return;
    router.push(`${ROUTES.today}?date=${next}`);
  }

  function saveStatus(summaryText: string) {
    if (!openCard?.status) {
      setError("Missing daily status row — refresh and retry.");
      return;
    }
    const statusId = openCard.status.id;
    const expectedRevision = openCard.status.revision;
    startTransition(async () => {
      if (!online) {
        await queueBoardMutation({
          userId: snapshot.profile.id,
          entityType: BOARD_ENTITY.dailyModuleStatus,
          entityId: statusId,
          payload: {
            kind: "daily_status",
            statusId,
            expectedRevision,
            status: "completed",
            summaryText,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setCards((prev) =>
          prev.map((c) =>
            c.status?.id === statusId
              ? {
                  ...c,
                  status: {
                    ...c.status!,
                    status: "completed",
                    summary_text: summaryText,
                  },
                  statusLabel: summaryText,
                }
              : c,
          ),
        );
        setOpenCardId(null);
        setStatusMessage("Status queued offline");
        return;
      }

      const result = await updateDailyStatusAction({
        statusId,
        expectedRevision,
        status: "completed",
        summaryText,
      });
      if (!result.ok) {
        setError(result.error);
        setStatusMessage(result.error);
        return;
      }
      setCards((prev) =>
        prev.map((c) =>
          c.status?.id === statusId
            ? {
                ...c,
                status: {
                  ...c.status!,
                  status: "completed",
                  summary_text: summaryText,
                  revision: c.status!.revision + 1,
                },
                statusLabel: summaryText,
              }
            : c,
        ),
      );
      setOpenCardId(null);
      setError(null);
      setStatusMessage("Daily module status saved");
      router.refresh();
    });
  }

  function workoutSaved(summaryText: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.definition.key === "workout"
          ? {
              ...c,
              status: c.status
                ? {
                    ...c.status,
                    status: "completed",
                    summary_text: summaryText,
                  }
                : c.status,
              statusLabel: summaryText,
            }
          : c,
      ),
    );
    setOpenCardId(null);
    setError(null);
    setStatusMessage("Workout finished");
    router.refresh();
  }

  function rehabSaved(summaryText: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.definition.key === "rehab"
          ? {
              ...c,
              status: c.status
                ? {
                    ...c.status,
                    status: "completed",
                    summary_text: summaryText,
                  }
                : c.status,
              statusLabel: summaryText,
            }
          : c,
      ),
    );
    setOpenCardId(null);
    setError(null);
    setStatusMessage("Rehab session finished");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ScreenReaderStatus message={statusMessage} />
      <SyncStatusBanner />
      <div className="flex flex-wrap items-center gap-2">
        <PixelButton tone="neutral" onClick={() => goDate(-1)} aria-label="Previous day">
          ← Prev
        </PixelButton>
        <label className="sr-only" htmlFor="today-date">
          Selected local date
        </label>
        <input
          id="today-date"
          type="date"
          max={today}
          className="min-h-11 border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper)] px-2 text-[var(--mt-ink)]"
          value={snapshot.localDate}
          onChange={(e) => router.push(`${ROUTES.today}?date=${e.target.value}`)}
        />
        <PixelButton
          tone="neutral"
          onClick={() => goDate(1)}
          aria-label="Next day"
          disabled={atToday}
        >
          Next →
        </PixelButton>
        <AppLink
          href={ROUTES.customize}
          className="inline-flex min-h-11 items-center border-2 border-[var(--mt-neon-lime)] bg-[var(--mt-neon-lime)] px-3 text-sm font-extrabold text-[var(--mt-ink)] no-underline"
        >
          Customize board
        </AppLink>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-2 border-[var(--mt-danger)] bg-[var(--mt-paper)] px-3 py-2 text-sm font-bold text-[var(--mt-danger)]"
        >
          {error}
        </p>
      ) : null}

      {cards.length === 0 ? (
        <p className="border-2 border-[var(--mt-neon-yellow)] bg-[var(--mt-paper-warm)] px-4 py-3 text-[var(--mt-ink)]">
          No modules enabled. <AppLink href={ROUTES.customize}>Enable modules</AppLink> to
          build your desk.
        </p>
      ) : null}

      <FlatLayBoard
        title="TODAY"
        statusItems={[
          { label: "Date", value: snapshot.localDate },
          { label: "Timezone", value: snapshot.profile.timezone },
          { label: "Name", value: snapshot.profile.display_name || "Athlete" },
          { label: "Units", value: snapshot.profile.units_system },
          {
            label: "Layout",
            value: `v${snapshot.layout.version}`,
          },
        ]}
        targetMetrics={targetMetrics}
        motionPreference={motionPreference}
        dimmed={openCardId !== null}
        inertBoard={openCardId !== null}
        toolbar={<MotionDevToggle />}
        stickers={
          <div className="pointer-events-none flex flex-wrap gap-2" aria-hidden>
            <StickerBadge tone="lime">Live status</StickerBadge>
            <StickerBadge tone="pink">Demo details</StickerBadge>
          </div>
        }
      >
        {cards.map((view, index) => {
          const visual = variantToFlatLay(view.card.visual_variant);
          const rotClass =
            index % 3 === 0
              ? boardLayoutStyles.rotBreakfast
              : index % 3 === 1
                ? boardLayoutStyles.rotWorkout
                : boardLayoutStyles.rotWater;
          return (
            <div
              key={view.card.id}
              className={cn(boardLayoutStyles.slot ?? "", rotClass ?? "")}
            >
              <FlatLayCard
                id={view.card.id}
                title={view.title}
                status={view.statusLabel}
                variant={visual.kind}
                paperTone={visual.paperTone}
                windowAccent={visual.windowAccent}
                motionPreference={motionPreference}
                onOpen={() => {
                  setOpenCardId(view.card.id);
                  setStatusMessage(`${view.title} focus opened`);
                }}
              />
            </div>
          );
        })}
      </FlatLayBoard>

      <FocusLayer
        open={openCard !== null}
        title={openCard ? `${openCard.title} (status)` : ""}
        titleId="focus-title-live"
        triggerId={openCard ? `board-card-${openCard.card.id}` : "board-card-x"}
        motionPreference={motionPreference}
        onClose={() => setOpenCardId(null)}
      >
        {openCard ? (
          <ModuleFocusRouter
            moduleKey={openCard.definition.key}
            titleId="focus-title-live"
            demo={demo}
            pending={pending}
            userId={snapshot.profile.id}
            dailyRecordId={snapshot.dailyRecordId}
            localDate={snapshot.localDate}
            timezone={snapshot.profile.timezone}
            workoutDaySummary={snapshot.workoutDaySummary}
            rehabDaySummary={snapshot.rehabDaySummary}
            onCancel={() => setOpenCardId(null)}
            onSaveStatus={saveStatus}
            onWorkoutSaved={workoutSaved}
            onRehabSaved={rehabSaved}
          />
        ) : null}
      </FocusLayer>
    </div>
  );
}

function ModuleFocusRouter({
  moduleKey,
  titleId,
  demo,
  pending,
  userId,
  dailyRecordId,
  localDate,
  timezone,
  workoutDaySummary,
  rehabDaySummary,
  onCancel,
  onSaveStatus,
  onWorkoutSaved,
  onRehabSaved,
}: {
  moduleKey: string;
  titleId: string;
  demo: ReturnType<typeof createInitialDemoState>;
  pending: boolean;
  userId: string;
  dailyRecordId: string;
  localDate: string;
  timezone: string;
  workoutDaySummary?: BoardSnapshot["workoutDaySummary"];
  rehabDaySummary?: BoardSnapshot["rehabDaySummary"];
  onCancel: () => void;
  onSaveStatus: (summary: string) => void;
  onWorkoutSaved: (summary: string) => void;
  onRehabSaved: (summary: string) => void;
}) {
  if (moduleKey === "nutrition") {
    return (
      <MealFocus
        titleId={titleId}
        dailyRecordId={dailyRecordId}
        localDate={localDate}
        onSaved={onSaveStatus}
        onCancel={onCancel}
      />
    );
  }
  if (moduleKey === "workout") {
    return (
      <WorkoutFocus
        titleId={titleId}
        userId={userId}
        dailyRecordId={dailyRecordId}
        localDate={localDate}
        timezone={timezone}
        workoutDaySummary={workoutDaySummary}
        hasActiveRehabRestrictions={rehabDaySummary?.hasActiveRestrictions ?? false}
        onSaved={onWorkoutSaved}
        onCancel={onCancel}
      />
    );
  }
  if (moduleKey === "rehab") {
    return (
      <RehabFocus
        titleId={titleId}
        userId={userId}
        dailyRecordId={dailyRecordId}
        localDate={localDate}
        timezone={timezone}
        rehabDaySummary={rehabDaySummary}
        onSaved={onRehabSaved}
        onCancel={onCancel}
      />
    );
  }
  if (moduleKey === "hydration") {
    return (
      <WaterFocus
        titleId={titleId}
        initial={demo.water}
        onSave={() => onSaveStatus("Hydration demo status saved")}
        onCancel={onCancel}
      />
    );
  }
  if (moduleKey === "meditation") {
    return (
      <MeditationFocus
        titleId={titleId}
        initial={demo.meditation}
        onSave={() => onSaveStatus("Meditation demo completed")}
        onCancel={onCancel}
      />
    );
  }
  if (moduleKey === "measurements") {
    return (
      <MeasurementsFocus
        titleId={titleId}
        initial={demo.measurements}
        onSave={() => onSaveStatus("Measurements demo logged")}
        onCancel={onCancel}
      />
    );
  }
  if (moduleKey === "progress_photos" || moduleKey === "profile") {
    return (
      <ProfileFocus
        titleId={titleId}
        initial={demo.profile}
        onSave={() => onSaveStatus("Profile preview saved (status only)")}
        onCancel={onCancel}
      />
    );
  }

  return (
    <FocusPanel
      title={`${moduleKey} (demo shell)`}
      titleId={titleId}
      onClose={onCancel}
      footer={
        <>
          <PixelButton
            tone="primary"
            loading={pending}
            onClick={() => onSaveStatus(`${moduleKey} marked completed (demo)`)}
          >
            Save status
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <p className="text-sm text-[var(--mt-ink)]">
        Domain details for <strong>{moduleKey}</strong> are still preview/demo. Saving
        only updates <code>daily_module_statuses</code>.
      </p>
    </FocusPanel>
  );
}
