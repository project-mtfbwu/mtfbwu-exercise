"use client";

import { useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { PaperCard } from "@/shared/ui/flat-lay/paper-card";
import {
  reorderBoardCardsAction,
  resetLayoutAction,
  setModuleEnabledAction,
  updateCardVariantAction,
} from "@/shared/board/actions";
import { labelForStatus } from "@/shared/board/board-model";
import type { BoardCardView } from "@/shared/board/board-model";
import type {
  UserModule,
  ModuleDefinition,
  CardVisualVariant,
} from "@/shared/database/types";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import { SyncStatusBanner } from "@/widgets/sync/sync-status-banner";
import { BOARD_ENTITY, queueBoardMutation } from "@/shared/offline/board-outbox";
import { useOnlineStore } from "@/shared/offline/online-store";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";
import { createBoardSyncCoordinator } from "@/shared/offline/sync-coordinator";
import { createSupabaseBrowserClient } from "@/shared/database/client";
import { cardVisualVariantSchema } from "@/shared/validation/increment3";
import {
  archiveUserTrackerAction,
  restoreUserTrackerAction,
  setTrackerTargetAction,
  updateCustomTrackerAction,
} from "@/modules/trackers/actions";
import {
  buildTrackerTargetWrites,
  buildUserTrackerWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import { todayLocalDate } from "@/shared/utils/local-date";
import { cardsDirty, moveCardIndex } from "@/widgets/customize/customize-helpers";

type ModuleRow = {
  userModule: UserModule;
  definition: ModuleDefinition;
};

export type CustomTrackerRow = {
  id: string;
  displayName: string;
  customName: string | null;
  enabled: boolean;
  archivedAt: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  targetConfirmed: boolean;
};

type Props = {
  userId: string;
  layoutId: string;
  layoutVersion: number;
  cards: BoardCardView[];
  allModules: ModuleRow[];
  customTrackers: CustomTrackerRow[];
  timezone: string;
};

const VARIANTS = cardVisualVariantSchema.options;

export function CustomizeBoardClient({
  userId,
  layoutId,
  layoutVersion,
  cards: initialCards,
  allModules,
  customTrackers: initialTrackers,
  timezone,
}: Props) {
  const [committedCards, setCommittedCards] = useState(initialCards);
  const [cards, setCards] = useState(initialCards);
  const [version, setVersion] = useState(layoutVersion);
  const [modules, setModules] = useState(allModules);
  const [trackers, setTrackers] = useState(initialTrackers);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";
  const layoutDirty = cardsDirty(cards, committedCards);

  function move(index: number, direction: -1 | 1) {
    setCards((prev) => moveCardIndex(prev, index, direction));
  }

  function cancelLayoutEdits() {
    setCards(committedCards);
    setMessage("Unsaved layout changes discarded.");
    setError(null);
  }

  function saveOrder() {
    startTransition(async () => {
      if (!online) {
        await queueBoardMutation({
          userId,
          entityType: BOARD_ENTITY.dashboardLayout,
          entityId: layoutId,
          payload: {
            kind: "reorder_cards",
            layoutId,
            expectedVersion: version,
            orderedCardIds: cards.map((c) => c.card.id),
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setCommittedCards(cards);
        setMessage("Layout queued offline");
        setError(null);
        return;
      }

      const result = await reorderBoardCardsAction({
        layoutId,
        expectedVersion: version,
        orderedCardIds: cards.map((c) => c.card.id),
      });
      if (!result.ok) {
        setError(
          result.error.includes("version") || result.error.includes("conflict")
            ? `${result.error} — refresh and try again.`
            : result.error,
        );
        setMessage(null);
        return;
      }
      setVersion((v) => v + 1);
      setCommittedCards(cards);
      setMessage(result.message ?? "Saved");
      setError(null);
    });
  }

  function toggleModule(userModuleId: string, enabled: boolean) {
    startTransition(async () => {
      setModules((prev) =>
        prev.map((m) =>
          m.userModule.id === userModuleId
            ? { ...m, userModule: { ...m.userModule, enabled } }
            : m,
        ),
      );

      if (!online) {
        await queueBoardMutation({
          userId,
          entityType: BOARD_ENTITY.userModule,
          entityId: userModuleId,
          payload: { kind: "set_module_enabled", userModuleId, enabled },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setMessage(enabled ? "Enable queued offline" : "Disable queued offline");
        return;
      }

      const result = await setModuleEnabledAction({ userModuleId, enabled });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(enabled ? "Module enabled" : "Module disabled");
    });
  }

  function changeVariant(cardId: string, visualVariant: CardVisualVariant) {
    startTransition(async () => {
      setCards((prev) =>
        prev.map((c) =>
          c.card.id === cardId
            ? { ...c, card: { ...c.card, visual_variant: visualVariant } }
            : c,
        ),
      );

      if (!online) {
        await queueBoardMutation({
          userId,
          entityType: BOARD_ENTITY.dashboardCard,
          entityId: cardId,
          payload: {
            kind: "card_variant",
            cardId,
            layoutId,
            visualVariant,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        setMessage("Look queued offline");
        return;
      }

      const result = await updateCardVariantAction({
        cardId,
        layoutId,
        visualVariant,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Updated");
    });
  }

  function reset() {
    if (!online) {
      setError(
        "Reset layout requires an internet connection. Tracker data is not affected.",
      );
      setShowResetConfirm(false);
      return;
    }
    startTransition(async () => {
      const result = await resetLayoutAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        result.message ?? "Reset — card order restored; tracker data unchanged.",
      );
      setShowResetConfirm(false);
      window.location.reload();
    });
  }

  function saveTrackerTarget(
    trackerId: string,
    value: string,
    unit: string,
    confirmed: boolean,
  ) {
    const targetValue = value.trim() === "" ? null : Number(value);
    if (targetValue != null && !Number.isFinite(targetValue)) {
      setError("Enter a valid target value.");
      return;
    }
    startTransition(async () => {
      const effectiveFrom = todayLocalDate(timezone);
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.trackerTarget,
          entityId: trackerId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.trackerTarget,
            dependsOnEntityIds: [trackerId],
            writes: buildTrackerTargetWrites({
              userTrackerId: trackerId,
              effectiveFrom,
              targetValue,
              targetUnit: unit || null,
              confirmedByUser: confirmed,
            }),
          },
          trackerTargetDraft: {
            targetId: trackerId,
            payload: { targetValue, targetUnit: unit, confirmed },
          },
        });
        setTrackers((prev) =>
          prev.map((t) =>
            t.id === trackerId
              ? {
                  ...t,
                  targetValue,
                  targetUnit: unit || null,
                  targetConfirmed: confirmed,
                }
              : t,
          ),
        );
        setMessage("Target queued offline");
        return;
      }
      const result = await setTrackerTargetAction({
        userTrackerId: trackerId,
        effectiveFrom,
        targetValue,
        targetUnit: unit || undefined,
        confirmedByUser: confirmed,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTrackers((prev) =>
        prev.map((t) =>
          t.id === trackerId
            ? {
                ...t,
                targetValue,
                targetUnit: unit || null,
                targetConfirmed: confirmed,
              }
            : t,
        ),
      );
      setMessage("Target saved");
    });
  }

  function renameTracker(trackerId: string, name: string) {
    startTransition(async () => {
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.userTracker,
          entityId: trackerId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.userTracker,
            writes: buildUserTrackerWrites({
              trackerId,
              userId,
              customName: name,
            }),
          },
        });
        setTrackers((prev) =>
          prev.map((t) =>
            t.id === trackerId ? { ...t, customName: name, displayName: name } : t,
          ),
        );
        setMessage("Rename queued offline");
        return;
      }
      const result = await updateCustomTrackerAction({ id: trackerId, customName: name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTrackers((prev) =>
        prev.map((t) =>
          t.id === trackerId ? { ...t, customName: name, displayName: name } : t,
        ),
      );
      setMessage(result.message);
    });
  }

  async function archiveTracker(trackerId: string, archive: boolean) {
    startTransition(async () => {
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.userTracker,
          entityId: trackerId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.userTracker,
            writes: buildUserTrackerWrites({
              trackerId,
              userId,
              archivedAt: archive ? new Date().toISOString() : null,
              enabled: !archive,
            }),
          },
        });
        setTrackers((prev) =>
          prev.map((t) =>
            t.id === trackerId
              ? {
                  ...t,
                  archivedAt: archive ? new Date().toISOString() : null,
                  enabled: !archive,
                }
              : t,
          ),
        );
        setMessage(archive ? "Archive queued offline" : "Restore queued offline");
        return;
      }
      const result = archive
        ? await archiveUserTrackerAction({ id: trackerId })
        : await restoreUserTrackerAction({ id: trackerId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTrackers((prev) =>
        prev.map((t) =>
          t.id === trackerId
            ? {
                ...t,
                archivedAt: archive ? new Date().toISOString() : null,
                enabled: !archive,
              }
            : t,
        ),
      );
      setMessage(result.message);
    });
  }

  function retrySync() {
    startTransition(async () => {
      const coordinator = createBoardSyncCoordinator(() => createSupabaseBrowserClient());
      await coordinator.flush();
    });
  }

  const previewCard = cards.find((c) => c.card.id === previewCardId) ?? cards[0] ?? null;

  return (
    <div className="space-y-4">
      <SyncStatusBanner />
      <div className="flex flex-wrap gap-2">
        <AppLink href={ROUTES.today}>← Back to Today</AppLink>
        <PixelButton tone="neutral" disabled={!online || pending} onClick={retrySync}>
          Flush sync
        </PixelButton>
      </div>
      <RetroWindow title="Customize my board" accent="lime">
        <p className="mb-3 text-sm text-[var(--mt-ink-muted)]">
          Keyboard reorder with Move up/down. Layout version {version}. Card order uses
          Save; module toggles apply immediately. Reset restores card layout only — not
          tracker data or targets.
        </p>
        {error ? (
          <p role="alert" className="mb-2 font-bold text-[var(--mt-danger)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="mb-2 font-bold text-[var(--mt-success)]">
            {message}
          </p>
        ) : null}

        {previewCard ? (
          <PaperCard className="mb-4">
            <h2 className="mb-2 text-lg font-black uppercase">Preview</h2>
            <button
              type="button"
              className="w-full border-2 border-[var(--mt-ink)] bg-[var(--mt-paper-cream)] p-3 text-left"
              onClick={() =>
                setPreviewCardId((id) =>
                  id === previewCard.card.id ? null : previewCard.card.id,
                )
              }
            >
              <span className="font-black uppercase">{previewCard.title}</span>
              <span className="mt-1 block text-sm">
                {labelForStatus(
                  previewCard.definition,
                  previewCard.status,
                  previewCard.userModule.custom_label,
                )}
              </span>
            </button>
          </PaperCard>
        ) : null}

        <PaperCard className="mb-4">
          <h2 className="mb-2 text-lg font-black uppercase">Card order & look</h2>
          <ol className="space-y-2">
            {cards.map((card, index) => (
              <li
                key={card.card.id}
                className="flex flex-col gap-2 border-2 border-[var(--mt-ink)] bg-white/80 p-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-bold">
                  {index + 1}. {card.title}
                </span>
                <div className="flex flex-wrap gap-2">
                  <PixelButton
                    tone="neutral"
                    onClick={() => setPreviewCardId(card.card.id)}
                  >
                    Preview
                  </PixelButton>
                  <label className="flex items-center gap-1 text-xs font-bold">
                    Look
                    <select
                      className="min-h-11 border-2 border-[var(--mt-ink)] bg-white px-2"
                      value={card.card.visual_variant}
                      disabled={pending}
                      aria-label={`Visual variant for ${card.title}`}
                      onChange={(e) =>
                        changeVariant(card.card.id, e.target.value as CardVisualVariant)
                      }
                    >
                      {VARIANTS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <PixelButton
                    tone="neutral"
                    aria-label={`Move ${card.title} up`}
                    disabled={index === 0 || pending}
                    onClick={() => move(index, -1)}
                  >
                    Up
                  </PixelButton>
                  <PixelButton
                    tone="neutral"
                    aria-label={`Move ${card.title} down`}
                    disabled={index === cards.length - 1 || pending}
                    onClick={() => move(index, 1)}
                  >
                    Down
                  </PixelButton>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <PixelButton tone="primary" loading={pending} onClick={saveOrder}>
              Save layout
            </PixelButton>
            <PixelButton
              tone="neutral"
              disabled={pending || !layoutDirty}
              onClick={cancelLayoutEdits}
            >
              Cancel layout changes
            </PixelButton>
            <PixelButton
              tone="danger"
              disabled={pending}
              onClick={() => setShowResetConfirm(true)}
            >
              Reset to defaults
            </PixelButton>
          </div>
          {showResetConfirm ? (
            <div className="mt-3 border-2 border-[var(--mt-danger)] p-3">
              <p className="text-sm font-bold">
                Reset card order and variants to defaults? This does not delete tracker
                logs, targets, or supplement lists.
              </p>
              {!online ? (
                <p className="mt-1 text-xs text-[var(--mt-ink-muted)]">
                  Reset requires an internet connection.
                </p>
              ) : null}
              <div className="mt-2 flex gap-2">
                <PixelButton tone="danger" loading={pending} onClick={reset}>
                  Confirm reset
                </PixelButton>
                <PixelButton tone="neutral" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </PixelButton>
              </div>
            </div>
          ) : null}
        </PaperCard>

        <PaperCard className="mb-4">
          <h2 className="mb-2 text-lg font-black uppercase">Enabled modules</h2>
          <ul className="space-y-2">
            {modules.map((row) => (
              <li key={row.userModule.id}>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={row.userModule.enabled}
                    disabled={pending}
                    onChange={(e) => toggleModule(row.userModule.id, e.target.checked)}
                  />
                  <span className="font-bold">{row.definition.display_name}</span>
                  {row.definition.category === "custom" ? (
                    <span className="text-xs text-[var(--mt-ink-muted)]">
                      {row.userModule.custom_label ?? "custom module"}
                    </span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        </PaperCard>

        {trackers.length > 0 ? (
          <PaperCard>
            <h2 className="mb-2 text-lg font-black uppercase">Custom trackers</h2>
            <ul className="space-y-4">
              {trackers.map((tracker) => (
                <TrackerRowEditor
                  key={tracker.id}
                  tracker={tracker}
                  pending={pending}
                  onRename={(name) => renameTracker(tracker.id, name)}
                  onSaveTarget={(value, unit, confirmed) =>
                    saveTrackerTarget(tracker.id, value, unit, confirmed)
                  }
                  onArchive={(archive) => void archiveTracker(tracker.id, archive)}
                />
              ))}
            </ul>
          </PaperCard>
        ) : null}
      </RetroWindow>
    </div>
  );
}

function TrackerRowEditor({
  tracker,
  pending,
  onRename,
  onSaveTarget,
  onArchive,
}: {
  tracker: CustomTrackerRow;
  pending: boolean;
  onRename: (name: string) => void;
  onSaveTarget: (value: string, unit: string, confirmed: boolean) => void;
  onArchive: (archive: boolean) => void;
}) {
  const [name, setName] = useState(tracker.customName ?? tracker.displayName);
  const [targetValue, setTargetValue] = useState(
    tracker.targetValue != null ? String(tracker.targetValue) : "",
  );
  const [targetUnit, setTargetUnit] = useState(tracker.targetUnit ?? "");
  const [confirmed, setConfirmed] = useState(tracker.targetConfirmed);

  return (
    <li className="border-2 border-[var(--mt-ink)] p-2">
      <p className="font-bold">
        {tracker.displayName}
        {tracker.archivedAt ? " (archived)" : null}
      </p>
      <label className="mt-2 block text-sm font-bold">
        Display name
        <input
          className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
          value={name}
          disabled={pending || !!tracker.archivedAt}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== tracker.displayName) onRename(name.trim());
          }}
        />
      </label>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="block text-sm font-bold">
          Target value
          <input
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
            inputMode="decimal"
            value={targetValue}
            disabled={pending || !!tracker.archivedAt}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        </label>
        <label className="block text-sm font-bold">
          Unit
          <input
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
            value={targetUnit}
            disabled={pending || !!tracker.archivedAt}
            onChange={(e) => setTargetUnit(e.target.value)}
          />
        </label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={pending || !!tracker.archivedAt}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        I confirm this target is intentional
      </label>
      {!confirmed && targetValue ? (
        <p className="text-xs text-[var(--mt-ink-muted)]">
          Unconfirmed placeholder — not used for streak pressure until confirmed.
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <PixelButton
          tone="primary"
          disabled={pending || !!tracker.archivedAt}
          onClick={() => onSaveTarget(targetValue, targetUnit, confirmed)}
        >
          Save target
        </PixelButton>
        <PixelButton
          tone="neutral"
          disabled={pending}
          onClick={() => onArchive(!tracker.archivedAt)}
        >
          {tracker.archivedAt ? "Restore" : "Archive"}
        </PixelButton>
      </div>
    </li>
  );
}
