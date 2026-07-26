import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlatLayCard } from "@/shared/ui/flat-lay/flat-lay-card";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";

describe("flat-lay primitives a11y smoke", () => {
  it("FlatLayCard is a named button control", () => {
    render(
      <FlatLayCard
        id="demo"
        title="Demo"
        status="Demo status"
        motionPreference="off"
        onOpen={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /Open Demo/i })).toHaveAttribute(
      "aria-haspopup",
      "dialog",
    );
  });

  it("PixelButton supports loading and disabled states", () => {
    const { rerender } = render(<PixelButton loading>Save</PixelButton>);
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Save/i })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    rerender(<PixelButton disabled>Save</PixelButton>);
    expect(screen.getByRole("button", { name: /Save/i })).toBeDisabled();
  });
});
