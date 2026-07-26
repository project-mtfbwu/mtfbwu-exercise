import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MotionPreferenceProvider } from "@/shared/providers/motion-provider";
import TodayPage from "@/app/today/page";

describe("Today route", () => {
  it("renders live flat-lay board instead of placeholder", () => {
    render(
      <MotionPreferenceProvider>
        <TodayPage />
      </MotionPreferenceProvider>,
    );
    expect(screen.getByRole("heading", { level: 1, name: /today/i })).toBeInTheDocument();
    expect(screen.getByTestId("flat-lay-board")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Board placeholder" }),
    ).not.toBeInTheDocument();
  });
});
