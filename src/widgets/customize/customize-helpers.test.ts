import { describe, expect, it } from "vitest";
import { cardsDirty, moveCardIndex } from "@/widgets/customize/customize-helpers";
import type { BoardCardView } from "@/shared/board/board-model";

function card(id: string): BoardCardView {
  return {
    card: {
      id,
      dashboard_layout_id: "l1",
      user_module_id: "m1",
      position_index: 0,
      desktop_row: 0,
      desktop_column: 0,
      desktop_span: 1,
      tablet_position: 0,
      mobile_position: 0,
      rotation: 0,
      visual_variant: "paper_cream",
      created_at: "",
      updated_at: "",
    },
    userModule: {
      id: "m1",
      user_id: "u1",
      module_definition_id: "d1",
      enabled: true,
      custom_label: null,
      target_value: null,
      target_unit: null,
      created_at: "",
      updated_at: "",
    },
    definition: {
      id: "d1",
      key: "nutrition",
      display_name: "Nutrition",
      category: "nutrition",
      description: "",
      default_enabled: true,
      default_order: 0,
      visual_variant: "paper_cream",
      icon_key: "food",
      supports_calendar: false,
      supports_target: false,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
    status: null,
    title: "Nutrition",
    statusLabel: "Nutrition · not started",
  };
}

describe("moveCardIndex", () => {
  it("swaps adjacent cards", () => {
    const cards = [card("a"), card("b"), card("c")];
    const moved = moveCardIndex(cards, 1, -1);
    expect(moved.map((c) => c.card.id)).toEqual(["b", "a", "c"]);
  });

  it("no-ops at bounds", () => {
    const cards = [card("a"), card("b")];
    expect(moveCardIndex(cards, 0, -1)).toEqual(cards);
    expect(moveCardIndex(cards, 1, 1)).toEqual(cards);
  });
});

describe("cardsDirty", () => {
  it("detects reorder drift from committed", () => {
    const committed = [card("a"), card("b")];
    const draft = moveCardIndex(committed, 0, 1);
    expect(cardsDirty(draft, committed)).toBe(true);
    expect(cardsDirty(committed, committed)).toBe(false);
  });
});
