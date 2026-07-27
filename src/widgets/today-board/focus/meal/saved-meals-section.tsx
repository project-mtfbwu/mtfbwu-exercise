"use client";

import { useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import type { MealTemplateView } from "@/modules/nutrition/meals/types";
import type { StarterTemplateKind } from "@/modules/nutrition/meals/actions";

const STARTER_KINDS: { kind: StarterTemplateKind; label: string }[] = [
  { kind: "chicken", label: "Chicken" },
  { kind: "plant", label: "Plant" },
  { kind: "fish", label: "Fish" },
];

export function SavedMealsSection({
  templates,
  pending,
  canSaveAsTemplate,
  onApplyTemplate,
  onSaveAsTemplate,
  onInstallStarter,
}: {
  templates: MealTemplateView[];
  pending: boolean;
  canSaveAsTemplate: boolean;
  onApplyTemplate: (templateId: string) => void;
  onSaveAsTemplate: (name: string) => void;
  onInstallStarter: (kind: StarterTemplateKind) => void;
}) {
  const [templateName, setTemplateName] = useState("");

  return (
    <details className="mt-3 border-2 border-[var(--mt-ink)] bg-white/75 p-2" open>
      <summary className="cursor-pointer font-extrabold uppercase select-none">
        Saved meals & starters
      </summary>
      <div className="mt-3 space-y-3">
        <div>
          <p className="text-sm font-extrabold uppercase">Install a starter plan</p>
          <p className="text-xs">
            Example day plans only — not medical prescriptions. Review portions before
            relying on the totals; fish calories vary by species.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STARTER_KINDS.map(({ kind, label }) => (
              <PixelButton
                key={kind}
                tone="purple"
                disabled={pending}
                onClick={() => onInstallStarter(kind)}
              >
                Install {label}
              </PixelButton>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase">Save this meal as a template</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-sm font-bold" htmlFor="save-template-name">
              Template name
              <input
                id="save-template-name"
                value={templateName}
                maxLength={120}
                onChange={(event) => setTemplateName(event.target.value)}
                className="mt-1 block min-h-11 w-48 border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
              />
            </label>
            <PixelButton
              tone="cyan"
              disabled={pending || !canSaveAsTemplate || !templateName.trim()}
              onClick={() => {
                onSaveAsTemplate(templateName.trim());
                setTemplateName("");
              }}
            >
              Save as template
            </PixelButton>
          </div>
          {!canSaveAsTemplate ? (
            <p className="text-xs">Save this meal first, then you can template it.</p>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase">Your saved templates</p>
          {templates.length ? (
            <ul className="mt-2 space-y-1">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--mt-ink)] bg-white p-2"
                >
                  <span>
                    <strong>{template.name}</strong>{" "}
                    <small>
                      ({template.items.length} item
                      {template.items.length === 1 ? "" : "s"})
                    </small>
                  </span>
                  <PixelButton
                    tone="cyan"
                    disabled={pending}
                    onClick={() => onApplyTemplate(template.id)}
                  >
                    Apply to this meal
                  </PixelButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm">No saved templates yet.</p>
          )}
        </div>
      </div>
    </details>
  );
}
