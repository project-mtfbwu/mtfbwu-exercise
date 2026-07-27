import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MotionPreferenceProvider } from "@/shared/providers/motion-provider";
import { createTestBoardSnapshot } from "@/test/board-snapshot-fixture";
import { TodayBoard } from "@/widgets/today-board/today-board";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/shared/board/actions", () => ({
  updateDailyStatusAction: vi.fn(async () => ({ ok: true })),
}));

describe("Today route board shell", () => {
  it("renders live flat-lay board from authenticated snapshot", () => {
    render(
      <MotionPreferenceProvider>
        <TodayBoard snapshot={createTestBoardSnapshot()} />
      </MotionPreferenceProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: /today/i })).toBeInTheDocument();
    expect(screen.getByTestId("flat-lay-board")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Board placeholder" }),
    ).not.toBeInTheDocument();
  });
});
