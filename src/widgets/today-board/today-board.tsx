"use client";

import { useCallback, useMemo, useState } from "react";
import { useMotionPreference } from "@/shared/providers/motion-provider";
import { FlatLayBoard, boardLayoutStyles } from "@/widgets/flat-lay-board";
import { FlatLayCard } from "@/shared/ui/flat-lay/flat-lay-card";
import { ProgressMeter } from "@/shared/ui/flat-lay/progress-meter";
import { StickerBadge } from "@/shared/ui/flat-lay/sticker-badge";
import { ScreenReaderStatus } from "@/shared/ui/screen-reader-status";
import { FocusLayer } from "@/widgets/focus-layer/focus-layer";
import { MotionDevToggle } from "./motion-dev-toggle";
import {
  DEMO_STATUS_ITEMS,
  createInitialDemoState,
  type DemoBoardState,
  type DemoModuleId,
} from "./demo-state";
import { BreakfastFocus } from "./focus/breakfast-focus";
import { WorkoutFocus } from "./focus/workout-focus";
import { WaterFocus } from "./focus/water-focus";
import { MeditationFocus } from "./focus/meditation-focus";
import { MeasurementsFocus } from "./focus/measurements-focus";
import { ProfileFocus } from "./focus/profile-focus";
import { cn } from "@/shared/utils/cn";

const TITLE_IDS: Record<DemoModuleId, string> = {
  breakfast: "focus-title-breakfast",
  workout: "focus-title-workout",
  water: "focus-title-water",
  meditation: "focus-title-meditation",
  measurements: "focus-title-measurements",
  profile: "focus-title-profile",
};

const SLOT_CLASS: Record<DemoModuleId, string> = {
  breakfast: boardLayoutStyles.rotBreakfast ?? "",
  workout: boardLayoutStyles.rotWorkout ?? "",
  water: boardLayoutStyles.rotWater ?? "",
  meditation: boardLayoutStyles.rotMeditation ?? "",
  measurements: boardLayoutStyles.rotMeasurements ?? "",
  profile: boardLayoutStyles.rotProfile ?? "",
};

export function TodayBoard() {
  const { resolution } = useMotionPreference();
  const motionPreference = resolution.preference;
  const [state, setState] = useState<DemoBoardState>(() => createInitialDemoState());
  const [openId, setOpenId] = useState<DemoModuleId | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [emptyBreakfast, setEmptyBreakfast] = useState(false);

  const close = useCallback(() => {
    setOpenId(null);
    setStatusMessage("Focus panel closed");
  }, []);

  const targetMetrics = useMemo(() => {
    const waterL = state.water.ml / 1000;
    return [
      {
        label: "Demo calories",
        value: 290,
        max: 1900,
        unit: "kcal",
        tone: "pink" as const,
      },
      {
        label: "Demo protein",
        value: 17,
        max: 150,
        unit: "g",
        tone: "lime" as const,
      },
      {
        label: "Demo water",
        value: Number(waterL.toFixed(2)),
        max: 3,
        unit: "L",
        tone: "cyan" as const,
      },
    ];
  }, [state.water.ml]);

  const focusTitle = openId
    ? `${openId.charAt(0).toUpperCase()}${openId.slice(1)} (demo)`
    : "";

  return (
    <div className="space-y-4">
      <ScreenReaderStatus message={statusMessage} />
      <FlatLayBoard
        title="TODAY"
        statusItems={[...DEMO_STATUS_ITEMS]}
        targetMetrics={targetMetrics}
        motionPreference={motionPreference}
        dimmed={openId !== null}
        inertBoard={openId !== null}
        toolbar={<MotionDevToggle />}
        stickers={
          <div className="pointer-events-none flex flex-wrap gap-2" aria-hidden>
            <StickerBadge tone="orange">Demo sticker</StickerBadge>
            <StickerBadge tone="cyan">Pixel vibes</StickerBadge>
          </div>
        }
      >
        <div className={cn(boardLayoutStyles.slot ?? "", SLOT_CLASS.breakfast)}>
          <FlatLayCard
            id="breakfast"
            title="Breakfast"
            status={emptyBreakfast ? "Empty demo card" : state.breakfast.savedLabel}
            variant="paper"
            paperTone="cream"
            rotationDeg={0}
            sticker="Yum"
            empty={emptyBreakfast}
            motionPreference={motionPreference}
            onOpen={() => {
              setOpenId("breakfast");
              setStatusMessage("Breakfast focus opened");
            }}
          />
        </div>
        <div className={cn(boardLayoutStyles.slot ?? "", SLOT_CLASS.workout)}>
          <FlatLayCard
            id="workout"
            title="Workout"
            status={state.workout.savedLabel}
            windowAccent="pink"
            sticker="Beast"
            motionPreference={motionPreference}
            onOpen={() => {
              setOpenId("workout");
              setStatusMessage("Workout focus opened");
            }}
          />
        </div>
        <div className={cn(boardLayoutStyles.slot ?? "", SLOT_CLASS.water)}>
          <FlatLayCard
            id="water"
            title="Water"
            status={state.water.savedLabel}
            windowAccent="cyan"
            motionPreference={motionPreference}
            onOpen={() => {
              setOpenId("water");
              setStatusMessage("Water focus opened");
            }}
          >
            <ProgressMeter
              label="Water"
              value={Number((state.water.ml / 1000).toFixed(2))}
              max={3}
              unit="L"
              tone="cyan"
              segments={8}
            />
          </FlatLayCard>
        </div>
        <div className={cn(boardLayoutStyles.slot ?? "", SLOT_CLASS.meditation)}>
          <FlatLayCard
            id="meditation"
            title="Meditation"
            status={state.meditation.savedLabel}
            windowAccent="purple"
            motionPreference={motionPreference}
            onOpen={() => {
              setOpenId("meditation");
              setStatusMessage("Meditation focus opened");
            }}
          />
        </div>
        <div className={cn(boardLayoutStyles.slot ?? "", SLOT_CLASS.measurements)}>
          <FlatLayCard
            id="measurements"
            title="Measurements"
            status={state.measurements.savedLabel}
            variant="paper"
            paperTone="yellow"
            motionPreference={motionPreference}
            onOpen={() => {
              setOpenId("measurements");
              setStatusMessage("Measurements focus opened");
            }}
          />
        </div>
        <div className={cn(boardLayoutStyles.slot ?? "", SLOT_CLASS.profile)}>
          <FlatLayCard
            id="profile"
            title="Profile"
            status={state.profile.savedLabel}
            windowAccent="blue"
            motionPreference={motionPreference}
            onOpen={() => {
              setOpenId("profile");
              setStatusMessage("Profile focus opened");
            }}
          />
        </div>
      </FlatLayBoard>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 border-2 border-[var(--mt-neon-yellow)] px-3 py-2 text-sm font-bold text-[var(--mt-neon-yellow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-ring)]"
          onClick={() => setEmptyBreakfast((v) => !v)}
        >
          Toggle empty Breakfast card (dev)
        </button>
        <button
          type="button"
          className="min-h-11 border-2 border-[var(--mt-ink-inverse)]/40 px-3 py-2 text-sm font-bold text-[var(--mt-ink-inverse)]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mt-focus-ring)]"
          disabled
          aria-disabled="true"
        >
          Disabled demo action
        </button>
      </div>

      <FocusLayer
        open={openId !== null}
        title={focusTitle}
        titleId={openId ? TITLE_IDS[openId] : "focus-title"}
        triggerId={openId ? `board-card-${openId}` : "board-card-breakfast"}
        motionPreference={motionPreference}
        onClose={close}
      >
        {openId === "breakfast" ? (
          <BreakfastFocus
            titleId={TITLE_IDS.breakfast}
            initial={
              emptyBreakfast
                ? { items: [], savedLabel: "Empty demo card" }
                : state.breakfast
            }
            onSave={(next) => {
              setState((s) => ({ ...s, breakfast: next }));
              setEmptyBreakfast(false);
              setOpenId(null);
              setStatusMessage("Breakfast demo saved");
            }}
            onCancel={close}
          />
        ) : null}
        {openId === "workout" ? (
          <WorkoutFocus
            titleId={TITLE_IDS.workout}
            initial={state.workout}
            onSave={(next) => {
              setState((s) => ({ ...s, workout: next }));
              setOpenId(null);
              setStatusMessage("Workout demo saved");
            }}
            onCancel={close}
          />
        ) : null}
        {openId === "water" ? (
          <WaterFocus
            titleId={TITLE_IDS.water}
            initial={state.water}
            onSave={(next) => {
              setState((s) => ({ ...s, water: next }));
              setOpenId(null);
              setStatusMessage("Water demo saved");
            }}
            onCancel={close}
          />
        ) : null}
        {openId === "meditation" ? (
          <MeditationFocus
            titleId={TITLE_IDS.meditation}
            initial={state.meditation}
            onSave={(next) => {
              setState((s) => ({ ...s, meditation: next }));
              setOpenId(null);
              setStatusMessage("Meditation demo saved");
            }}
            onCancel={close}
          />
        ) : null}
        {openId === "measurements" ? (
          <MeasurementsFocus
            titleId={TITLE_IDS.measurements}
            initial={state.measurements}
            onSave={(next) => {
              setState((s) => ({ ...s, measurements: next }));
              setOpenId(null);
              setStatusMessage("Measurements demo saved");
            }}
            onCancel={close}
          />
        ) : null}
        {openId === "profile" ? (
          <ProfileFocus
            titleId={TITLE_IDS.profile}
            initial={state.profile}
            onSave={(next) => {
              setState((s) => ({ ...s, profile: next }));
              setOpenId(null);
              setStatusMessage("Profile demo saved");
            }}
            onCancel={close}
          />
        ) : null}
      </FocusLayer>
    </div>
  );
}
