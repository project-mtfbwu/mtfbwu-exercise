/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "jest-axe";

/** Static stand-in mirroring Settings account controls (avoids server-action imports). */
function AccountLifecycleFixture() {
  return (
    <div>
      <section aria-labelledby="export-heading">
        <h3 id="export-heading">Export your data</h3>
        <p>Downloads a private JSON export.</p>
        <button type="button">Download export</button>
      </section>
      <section aria-labelledby="delete-heading">
        <h3 id="delete-heading">Delete account</h3>
        <label htmlFor="delete-confirm">Confirmation</label>
        <input id="delete-confirm" />
        <button type="button">Delete my account</button>
      </section>
    </div>
  );
}

describe("automated a11y (jest-axe)", () => {
  it("account lifecycle controls have no serious axe violations", async () => {
    const { container } = render(<AccountLifecycleFixture />);
    const results = await axe(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(serious).toEqual([]);
  });
});
