import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodayBoard } from "@/widgets/today-board/today-board";
import { MotionPreferenceProvider } from "@/shared/providers/motion-provider";
import { writeStoredMotionPreference } from "@/shared/providers/motion";

function renderBoard() {
  return render(
    <MotionPreferenceProvider>
      <TodayBoard />
    </MotionPreferenceProvider>,
  );
}

describe("Today flat-lay board (Increment 2)", () => {
  beforeEach(() => {
    writeStoredMotionPreference(window.localStorage, "off");
    window.dispatchEvent(new Event("mtfbwu-motion-change"));
  });

  it("renders the board heading and all demo module cards", () => {
    renderBoard();
    expect(screen.getByRole("heading", { level: 1, name: /today/i })).toBeInTheDocument();
    expect(screen.getByTestId("flat-lay-board")).toBeInTheDocument();

    for (const name of [
      /Open Breakfast/i,
      /Open Workout/i,
      /Open Water/i,
      /Open Meditation/i,
      /Open Measurements/i,
      /Open Profile/i,
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
    expect(
      screen.getByRole("heading", { name: /Breakfast \(demo\)/i }),
    ).toBeInTheDocument();
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

  it("Save updates collapsed demo state; Cancel does not", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /Open Water/i }));
    await user.click(screen.getByRole("button", { name: /\+500 ml/i }));
    await user.click(screen.getByRole("button", { name: /^Save$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /1\.25 \/ 3\.0 L \(demo\)/i }),
    ).toBeInTheDocument();

    const before = screen
      .getByRole("button", { name: /Open Profile/i })
      .getAttribute("aria-label");
    await user.click(screen.getByRole("button", { name: /Open Profile/i }));
    const nameInput = screen.getByLabelText(/Display name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Changed Name");
    await user.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(screen.getByRole("button", { name: /Open Profile/i })).toHaveAttribute(
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
    expect(dialog).toHaveAttribute("aria-labelledby", "focus-title-meditation");
  });

  it("does not call fetch for demo interactions", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    renderBoard();
    await user.click(screen.getByRole("button", { name: /Open Breakfast/i }));
    await user.click(screen.getByRole("button", { name: /Add item/i }));
    await user.click(screen.getByRole("button", { name: /^Save$/i }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
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
});
