import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FocusLayer } from "@/widgets/focus-layer/focus-layer";
import { useState } from "react";

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" id="board-card-demo" onClick={() => setOpen(true)}>
        Trigger
      </button>
      <FocusLayer
        open={open}
        title="Demo"
        titleId="focus-title-demo"
        triggerId="board-card-demo"
        motionPreference="off"
        onClose={() => setOpen(false)}
      >
        <div>
          <h2 id="focus-title-demo">Demo panel</h2>
          <button type="button" onClick={() => setOpen(false)}>
            Close panel
          </button>
        </div>
      </FocusLayer>
    </>
  );
}

describe("FocusLayer", () => {
  it("traps focus and closes on Escape with restoration", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trigger" })).toHaveFocus();
  });
});
