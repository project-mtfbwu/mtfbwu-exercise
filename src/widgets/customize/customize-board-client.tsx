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

type ModuleRow = {
  userModule: UserModule;
  definition: ModuleDefinition;
};

type Props = {
  userId: string;
  layoutId: string;
  layoutVersion: number;
  cards: BoardCardView[];
  allModules: ModuleRow[];
};

const VARIANTS = cardVisualVariantSchema.options;

export function CustomizeBoardClient({
  userId,
  layoutId,
  layoutVersion,
  cards: initialCards,
  allModules,
}: Props) {
  const [cards, setCards] = useState(initialCards);
  const [version, setVersion] = useState(layoutVersion);
  const [modules, setModules] = useState(allModules);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const onlineStatus = useOnlineStore((s) => s.status);
  const online = onlineStatus !== "offline";

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    setCards(next);
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
        setError(result.error);
        setMessage(null);
        return;
      }
      setVersion((v) => v + 1);
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
    startTransition(async () => {
      const result = await resetLayoutAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Reset");
      window.location.reload();
    });
  }

  function retrySync() {
    startTransition(async () => {
      const coordinator = createBoardSyncCoordinator(() => createSupabaseBrowserClient());
      await coordinator.flush();
    });
  }

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
          Keyboard reorder with Move up/down. Layout version {version}. Changes save
          optimistically and queue when offline.
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
            <PixelButton tone="danger" disabled={pending || !online} onClick={reset}>
              Reset to defaults
            </PixelButton>
          </div>
        </PaperCard>

        <PaperCard>
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
                      {row.userModule.custom_label ?? "optional label later"}
                    </span>
                  ) : null}
                </label>
              </li>
            ))}
          </ul>
        </PaperCard>
      </RetroWindow>
    </div>
  );
}
