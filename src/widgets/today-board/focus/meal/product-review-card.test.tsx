import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductReviewCard, type ProductReviewFood } from "./product-review-card";

const FOOD: ProductReviewFood = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Rolled Oats",
  brand: "Acme",
  barcode: "3017620422003",
  source: "open_food_facts",
  servingGrams: 40,
  servingLabel: "40 g",
  nutrientsPer100g: {
    energy_kcal: 389,
    protein_g: 16.9,
    carbohydrate_g: 66.3,
    fat_g: 6.9,
    fiber_g: 10.6,
    sugar_g: 0.9,
    saturated_fat_g: 1.2,
    sodium_mg: 6,
  },
};

describe("ProductReviewCard", () => {
  it("defaults the quantity stepper to the product's serving size", () => {
    render(
      <ProductReviewCard
        food={FOOD}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("confirms with the current stepper amount", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ProductReviewCard food={FOOD} onConfirm={onConfirm} onCancel={() => undefined} />,
    );

    await user.click(screen.getByRole("button", { name: /increase/i }));
    await user.click(screen.getByRole("button", { name: /confirm add/i }));

    expect(onConfirm).toHaveBeenCalledWith(45);
  });

  it("calls onCancel from resume scanning", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ProductReviewCard food={FOOD} onConfirm={() => undefined} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: /resume scanning/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("classifies a complete product and shows a quality badge", () => {
    render(
      <ProductReviewCard
        food={FOOD}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText(/looks complete/i)).toBeInTheDocument();
  });

  it("flags a product missing macro values", () => {
    const incomplete: ProductReviewFood = { ...FOOD, nutrientsPer100g: {} };
    render(
      <ProductReviewCard
        food={incomplete}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText(/missing macro values/i)).toBeInTheDocument();
  });
});
