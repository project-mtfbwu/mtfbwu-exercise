import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TodayPage from "@/app/today/page";

describe("Today route smoke", () => {
  it("renders semantic heading and board placeholder", () => {
    render(<TodayPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Board placeholder" }),
    ).toBeInTheDocument();
  });
});
