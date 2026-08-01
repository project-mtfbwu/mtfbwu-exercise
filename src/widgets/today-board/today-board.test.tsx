import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayBoard } from "@/widgets/today-board/today-board";
import { MotionPreferenceProvider } from "@/shared/providers/motion-provider";
import { writeStoredMotionPreference } from "@/shared/providers/motion";
import { createTestBoardSnapshot } from "@/test/board-snapshot-fixture";

const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/shared/board/actions", () => ({
  updateDailyStatusAction: vi.fn(async () => ({ ok: true, message: "saved" })),
}));

vi.mock("@/modules/nutrition/meals/actions", () => ({
  loadMealsForDailyRecord: vi.fn(async () => []),
  saveMealLogAction: vi.fn(),
  deleteMealLogAction: vi.fn(),
  copyMealFromDateAction: vi.fn(),
  listMealTemplatesAction: vi.fn(async () => []),
  applyMealTemplateAction: vi.fn(),
  saveMealAsTemplateAction: vi.fn(),
  installStarterTemplateAction: vi.fn(),
  listRecipesAction: vi.fn(async () => []),
  saveRecipeAction: vi.fn(),
  deleteRecipeAction: vi.fn(),
  saveCustomFoodAction: vi.fn(),
  loadNutritionGoalsAction: vi.fn(async () => null),
  updateNutritionGoalsAction: vi.fn(),
}));

vi.mock("@/modules/workout/sessions/actions", () => ({
  getActiveSessionAction: vi.fn(async () => null),
  listPlansAction: vi.fn(async () => []),
  listExercisesAction: vi.fn(async () => []),
  getSessionStartOptionsAction: vi.fn(async () => ({
    scheduled: null,
    lastCompleted: null,
    yesterdayCompleted: null,
    activeSession: null,
  })),
  listPendingPersonalRecordsAction: vi.fn(async () => []),
  copyYesterdaySessionAction: vi.fn(),
  repeatLastSessionAction: vi.fn(),
  confirmPersonalRecordAction: vi.fn(),
  dismissPersonalRecordAction: vi.fn(),
  startBlankSessionAction: vi.fn(),
  startFromPlanDayAction: vi.fn(),
  startScheduledSessionAction: vi.fn(),
  installArnoldStarterPlanAction: vi.fn(),
  completeSetAction: vi.fn(),
  skipSetAction: vi.fn(),
  addSetAction: vi.fn(),
  finishSessionAction: vi.fn(),
  cancelSessionAction: vi.fn(),
  getExerciseHistoryAction: vi.fn(async () => []),
  addExerciseToSessionAction: vi.fn(),
}));

vi.mock("@/modules/measurements/actions", () => ({
  listRecentWeightEntriesAction: vi.fn(async () => []),
  listUserMeasurementsAction: vi.fn(async () => []),
  saveWeightEntryAction: vi.fn(async () => ({ ok: true, message: "saved" })),
  saveMeasurementEntryAction: vi.fn(async () => ({ ok: true, message: "saved" })),
}));

vi.mock("@/modules/progress-photos/actions", () => ({
  createPhotoSetAction: vi.fn(async () => ({
    ok: true,
    message: "created",
    id: "set-1",
  })),
  uploadPhotoMetadataAction: vi.fn(async () => ({ ok: true, message: "saved" })),
  buildPhotoStoragePathAction: vi.fn(async () => ({
    path: "user/progress/set-1/front-p1.jpg",
    photoId: "p1",
  })),
}));

function renderBoard() {
  return render(
    <MotionPreferenceProvider>
      <TodayBoard snapshot={createTestBoardSnapshot()} />
    </MotionPreferenceProvider>,
  );
}

describe("Today flat-lay board (Increment 3)", () => {
  beforeEach(() => {
    writeStoredMotionPreference(window.localStorage, "off");
    window.dispatchEvent(new Event("mtfbwu-motion-change"));
    push.mockClear();
    refresh.mockClear();
  });

  it("renders the board heading and enabled module cards", () => {
    renderBoard();
    expect(screen.getByRole("heading", { level: 1, name: /today/i })).toBeInTheDocument();
    expect(screen.getByTestId("flat-lay-board")).toBeInTheDocument();

    for (const name of [
      /Open Breakfast/i,
      /Open Workout/i,
      /Open Water/i,
      /Open Meditation/i,
      /Open Measurements/i,
      /Open Progress photos/i,
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("makes module cards keyboard reachable and opens Breakfast focus", async () => {
    const user = userEvent.setup();
    renderBoard();
    const breakfast = screen.getByRole("button", { name: /Open Breakfast/i });
    breakfast.focus();
    expect(breakfast).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Breakfast meal/i })).toBeInTheDocument();
  });

  it("closes focus with Escape and restores trigger focus", async () => {
    const user = userEvent.setup();
    renderBoard();
    const breakfast = screen.getByRole("button", { name: /Open Breakfast/i });
    await user.click(breakfast);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(breakfast).toHaveFocus();
  });

  it("marks the board inert while focus mode is open", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(screen.getByRole("button", { name: /Open Breakfast/i }));
    const board = screen.getByTestId("flat-lay-board");
    expect(board).toHaveAttribute("inert");
    expect(board).toHaveAttribute("aria-hidden", "true");
  });

  it("Save updates daily status label; Cancel does not", async () => {
    const { updateDailyStatusAction } = await import("@/shared/board/actions");
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Open Water/i }));
    await user.click(screen.getByRole("button", { name: /\+500 ml/i }));
    await user.click(screen.getByRole("button", { name: /^Save$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(updateDailyStatusAction).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Hydration demo status saved/i }),
    ).toBeInTheDocument();

    const before = screen
      .getByRole("button", { name: /Open Meditation/i })
      .getAttribute("aria-label");
    await user.click(screen.getByRole("button", { name: /Open Meditation/i }));
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(screen.getByRole("button", { name: /Open Meditation/i })).toHaveAttribute(
      "aria-label",
      before,
    );
  });

  it("exposes dialog semantics on FocusLayer", async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(screen.getByRole("button", { name: /Open Meditation/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "focus-title-live");
  });

  it("motion toggle switches pressed mode", async () => {
    const user = userEvent.setup();
    renderBoard();
    const reduced = screen.getByRole("button", { name: /^reduced$/i });
    await user.click(reduced);
    expect(reduced).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps module grid without horizontal overflow class traps", () => {
    renderBoard();
    const grid = screen.getByTestId("board-module-grid");
    expect(grid.className).toMatch(/grid/);
    expect(within(grid).getAllByRole("button").length).toBeGreaterThanOrEqual(6);
  });

  it("shows empty state when no modules enabled", () => {
    render(
      <MotionPreferenceProvider>
        <TodayBoard snapshot={createTestBoardSnapshot({ cards: [] })} />
      </MotionPreferenceProvider>,
    );
    expect(screen.getByText(/No modules enabled/i)).toBeInTheDocument();
  });
});
