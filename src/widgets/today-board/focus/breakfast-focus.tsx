"use client";

import { useState } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { NumericStepper } from "@/shared/ui/flat-lay/numeric-stepper";
import { breakfastTotals, type BreakfastItem, type DemoBoardState } from "../demo-state";

export type BreakfastFocusProps = {
  titleId: string;
  initial: DemoBoardState["breakfast"];
  onSave: (next: DemoBoardState["breakfast"]) => void;
  onCancel: () => void;
};

export function BreakfastFocus({
  titleId,
  initial,
  onSave,
  onCancel,
}: BreakfastFocusProps) {
  const [items, setItems] = useState<BreakfastItem[]>(() =>
    initial.items.map((i) => ({ ...i })),
  );
  const [saving, setSaving] = useState(false);
  const totals = breakfastTotals(items);

  function updateQty(id: string, qty: number) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, qty } : item)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: `demo-${prev.length + 1}`,
        name: `Demo food ${prev.length + 1}`,
        qty: 1,
        kcal: 100,
        protein: 5,
        carbs: 10,
        fat: 3,
      },
    ]);
  }

  function handleSave() {
    setSaving(true);
    const label = `${items.length} demo items · ~${totals.kcal} kcal`;
    onSave({ items, savedLabel: label });
  }

  return (
    <FocusPanel
      title="Breakfast (demo)"
      titleId={titleId}
      chrome="paper"
      onClose={onCancel}
      footer={
        <>
          <PixelButton tone="primary" loading={saving} onClick={handleSave}>
            Save
          </PixelButton>
          <PixelButton tone="danger" onClick={onCancel} disabled={saving}>
            Cancel
          </PixelButton>
        </>
      }
    >
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--mt-ink)] bg-white/70 p-2"
          >
            <div>
              <p className="font-bold">{item.name}</p>
              <p className="text-xs text-[var(--mt-ink-muted)]">
                Demo macros · {item.kcal} kcal · P {item.protein} · C {item.carbs} · F{" "}
                {item.fat}
              </p>
            </div>
            <NumericStepper
              id={`qty-${item.id}`}
              label={`Quantity for ${item.name}`}
              value={item.qty}
              onChange={(qty) => updateQty(item.id, qty)}
              min={1}
              max={20}
            />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <PixelButton tone="cyan" onClick={addItem}>
          Add item
        </PixelButton>
        <p className="text-sm font-bold tabular-nums" aria-live="polite">
          Demo totals: {totals.kcal} kcal · P {totals.protein} · C {totals.carbs} · F{" "}
          {totals.fat}
        </p>
      </div>
    </FocusPanel>
  );
}
