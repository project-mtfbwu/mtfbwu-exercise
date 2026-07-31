"use client";

import { useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import type {
  ExerciseCatalogView,
  PlanBlockView,
  PlanDayView,
  WorkoutBlockType,
} from "@/modules/workout/sessions/types";
import { WORKOUT_BLOCK_TYPES } from "@/modules/workout/sessions/types";
import { PlanBlockExercises } from "./plan-block-exercises";
import {
  BLOCK_TYPE_LABELS,
  ROUNDS_BLOCK_TYPES,
  TRANSITION_BLOCK_TYPES,
  blockTypeGuidance,
  parseOptionalNumber,
} from "./constants";
import type { PlanEditorActions } from "./types";

type BlockDraft = {
  blockType: WorkoutBlockType;
  title: string;
  rounds: string;
  restSeconds: string;
  transitionSeconds: string;
};

function toBlockDraft(block: PlanBlockView): BlockDraft {
  return {
    blockType: block.blockType,
    title: block.title ?? "",
    rounds: block.rounds != null ? String(block.rounds) : "",
    restSeconds: block.restSeconds != null ? String(block.restSeconds) : "",
    transitionSeconds:
      block.transitionSeconds != null ? String(block.transitionSeconds) : "",
  };
}

function blockDraftEquals(a: BlockDraft, b: BlockDraft): boolean {
  return (
    a.blockType === b.blockType &&
    a.title === b.title &&
    a.rounds === b.rounds &&
    a.restSeconds === b.restSeconds &&
    a.transitionSeconds === b.transitionSeconds
  );
}

function BlockCard({
  planDayId,
  block,
  index,
  count,
  catalog,
  pending,
  actions,
}: {
  planDayId: string;
  block: PlanBlockView;
  index: number;
  count: number;
  catalog: ExerciseCatalogView[];
  pending: boolean;
  actions: PlanEditorActions;
}) {
  const [draft, setDraft] = useState(() => toBlockDraft(block));

  const dirty = !blockDraftEquals(draft, toBlockDraft(block));
  const guidance = blockTypeGuidance(draft.blockType);
  const showRounds = ROUNDS_BLOCK_TYPES.includes(draft.blockType);
  const showTransition = TRANSITION_BLOCK_TYPES.includes(draft.blockType);

  function save() {
    actions.updateBlock(block.id, {
      blockType: draft.blockType,
      title: draft.title.trim() || null,
      rounds: showRounds ? (parseOptionalNumber(draft.rounds) ?? null) : null,
      restSeconds: parseOptionalNumber(draft.restSeconds) ?? null,
      transitionSeconds: showTransition
        ? (parseOptionalNumber(draft.transitionSeconds) ?? null)
        : null,
    });
  }

  function remove() {
    const label = block.title || BLOCK_TYPE_LABELS[block.blockType];
    if (!window.confirm(`Delete the "${label}" block and everything in it?`)) return;
    actions.deleteBlock(block.id);
  }

  const idBase = `block-${block.id}`;

  return (
    <li className="border-2 border-[var(--mt-ink)] bg-white/80 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[10px] font-bold uppercase" htmlFor={`${idBase}-type`}>
          Block type
          <select
            id={`${idBase}-type`}
            value={draft.blockType}
            onChange={(event) =>
              setDraft((d) => ({
                ...d,
                blockType: event.target.value as WorkoutBlockType,
              }))
            }
            className="mt-1 block min-h-11 border-2 border-[var(--mt-ink)] bg-white px-1 text-sm font-normal normal-case"
          >
            {WORKOUT_BLOCK_TYPES.map((type) => (
              <option key={type} value={type}>
                {BLOCK_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase" htmlFor={`${idBase}-title`}>
          Title (optional)
          <input
            id={`${idBase}-title`}
            value={draft.title}
            maxLength={120}
            onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))}
            className="mt-1 block min-h-11 w-40 border-2 border-[var(--mt-ink)] px-2 text-sm font-normal normal-case"
          />
        </label>
        {showRounds ? (
          <label className="text-[10px] font-bold uppercase" htmlFor={`${idBase}-rounds`}>
            Rounds
            <input
              id={`${idBase}-rounds`}
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.rounds}
              onChange={(event) =>
                setDraft((d) => ({ ...d, rounds: event.target.value }))
              }
              className="mt-1 block min-h-11 w-16 border-2 border-[var(--mt-ink)] px-1 text-sm font-normal normal-case"
            />
          </label>
        ) : null}
        <label className="text-[10px] font-bold uppercase" htmlFor={`${idBase}-rest`}>
          Rest s
          <input
            id={`${idBase}-rest`}
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.restSeconds}
            onChange={(event) =>
              setDraft((d) => ({ ...d, restSeconds: event.target.value }))
            }
            className="mt-1 block min-h-11 w-16 border-2 border-[var(--mt-ink)] px-1 text-sm font-normal normal-case"
          />
        </label>
        {showTransition ? (
          <label
            className="text-[10px] font-bold uppercase"
            htmlFor={`${idBase}-transition`}
          >
            Transition s
            <input
              id={`${idBase}-transition`}
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.transitionSeconds}
              onChange={(event) =>
                setDraft((d) => ({ ...d, transitionSeconds: event.target.value }))
              }
              className="mt-1 block min-h-11 w-16 border-2 border-[var(--mt-ink)] px-1 text-sm font-normal normal-case"
            />
          </label>
        ) : null}
      </div>
      {guidance ? (
        <p className="mt-2 border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-2 text-xs font-bold">
          {guidance}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        <PixelButton tone="primary" disabled={!dirty || pending} onClick={save}>
          Save block
        </PixelButton>
        <PixelButton
          tone="neutral"
          aria-label={`Move block ${index + 1} up`}
          disabled={index === 0 || pending}
          onClick={() => actions.moveBlock(planDayId, block.id, -1)}
        >
          Up
        </PixelButton>
        <PixelButton
          tone="neutral"
          aria-label={`Move block ${index + 1} down`}
          disabled={index === count - 1 || pending}
          onClick={() => actions.moveBlock(planDayId, block.id, 1)}
        >
          Down
        </PixelButton>
        <PixelButton
          tone="cyan"
          disabled={pending}
          onClick={() => actions.duplicateBlock(block.id)}
        >
          Duplicate
        </PixelButton>
        <PixelButton tone="danger" disabled={pending} onClick={remove}>
          Delete
        </PixelButton>
      </div>
      <PlanBlockExercises
        blockId={block.id}
        exercises={block.exercises}
        catalog={catalog}
        pending={pending}
        actions={actions}
      />
    </li>
  );
}

export function PlanDayPanel({
  day,
  catalog,
  pending,
  actions,
}: {
  day: PlanDayView;
  catalog: ExerciseCatalogView[];
  pending: boolean;
  actions: PlanEditorActions;
}) {
  const [newBlockType, setNewBlockType] = useState<WorkoutBlockType>("straight_sets");

  return (
    <RetroWindow title={`${day.name} · blocks`} accent="cyan">
      {day.restDay ? (
        <p className="border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-2 text-sm font-bold">
          This day is marked as a rest day. Blocks below still save, but the day list
          flags it as rest.
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-end gap-2 border-2 border-[var(--mt-ink)] bg-white/80 p-2">
        <label className="text-[10px] font-bold uppercase" htmlFor="new-block-type">
          New block type
          <select
            id="new-block-type"
            value={newBlockType}
            onChange={(event) => setNewBlockType(event.target.value as WorkoutBlockType)}
            className="mt-1 block min-h-11 border-2 border-[var(--mt-ink)] bg-white px-1 text-sm font-normal normal-case"
          >
            {WORKOUT_BLOCK_TYPES.map((type) => (
              <option key={type} value={type}>
                {BLOCK_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <PixelButton
          tone="primary"
          disabled={pending}
          onClick={() => actions.addBlock(day.id, newBlockType)}
        >
          Add block
        </PixelButton>
      </div>
      {day.blocks.length === 0 ? (
        <p className="mt-3 text-sm">
          No blocks yet — add one above to start building this day.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {day.blocks.map((block, index) => (
            <BlockCard
              key={block.id}
              planDayId={day.id}
              block={block}
              index={index}
              count={day.blocks.length}
              catalog={catalog}
              pending={pending}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </RetroWindow>
  );
}
