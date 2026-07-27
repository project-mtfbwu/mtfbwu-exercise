import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingWizard } from "@/widgets/onboarding/onboarding-wizard";

const modules = [
  {
    key: "nutrition",
    display_name: "Nutrition",
    description: "Meals",
    default_enabled: true,
    category: "nutrition" as const,
  },
  {
    key: "swimming",
    display_name: "Swimming",
    description: "Optional",
    default_enabled: false,
    category: "training" as const,
  },
];

describe("OnboardingWizard", () => {
  it("preselects recommended modules and allows toggling optional ones", async () => {
    const user = userEvent.setup();
    render(<OnboardingWizard modules={modules} initialDisplayName="Ada" />);

    await user.click(screen.getByRole("button", { name: /Continue/i }));
    await user.click(screen.getByRole("button", { name: /Continue/i }));
    await user.click(screen.getByRole("button", { name: /Continue/i }));

    expect(screen.getByLabelText(/Nutrition/i)).toBeChecked();
    expect(screen.getByLabelText(/Swimming/i)).not.toBeChecked();
    expect(screen.queryByLabelText(/smoking-free/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Swimming/i));
    expect(screen.getByLabelText(/Swimming/i)).toBeChecked();
  });
});
