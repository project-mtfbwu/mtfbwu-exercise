import { createDexieOutboxRepository } from "@/shared/offline/outbox";
import { getDatabase, type OutboxRecord } from "@/shared/offline/db";
import type { DailyModuleStatusKind, CardVisualVariant } from "@/shared/database/types";

export const BOARD_ENTITY = {
  userModule: "user_module",
  dashboardLayout: "dashboard_layout",
  dashboardCard: "dashboard_card",
  dailyModuleStatus: "daily_module_status",
  profile: "profile",
} as const;

export type BoardOutboxPayload =
  | {
      kind: "set_module_enabled";
      userModuleId: string;
      enabled: boolean;
    }
  | {
      kind: "reorder_cards";
      layoutId: string;
      expectedVersion: number;
      orderedCardIds: string[];
    }
  | {
      kind: "card_variant";
      cardId: string;
      layoutId: string;
      visualVariant: CardVisualVariant;
    }
  | {
      kind: "daily_status";
      statusId: string;
      expectedRevision: number;
      status: DailyModuleStatusKind;
      summaryText?: string;
    }
  | {
      kind: "profile_prefs";
      unitsSystem?: "metric" | "imperial";
      animationMode?: "full" | "reduced" | "off";
      timezone?: string;
      displayName?: string;
    };

function repo() {
  return createDexieOutboxRepository(getDatabase());
}

export async function queueBoardMutation(input: {
  userId: string;
  entityType: string;
  entityId: string;
  payload: BoardOutboxPayload;
  idempotencyKey?: string;
}): Promise<OutboxRecord> {
  const idempotencyKey =
    input.idempotencyKey ??
    `${input.payload.kind}:${input.entityId}:${crypto.randomUUID()}`;

  return repo().queue({
    idempotencyKey,
    userId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    operationType: "update",
    payload: input.payload,
  });
}

export function isBoardOutboxPayload(value: unknown): value is BoardOutboxPayload {
  if (!value || typeof value !== "object") return false;
  const kind = (value as { kind?: string }).kind;
  return (
    kind === "set_module_enabled" ||
    kind === "reorder_cards" ||
    kind === "card_variant" ||
    kind === "daily_status" ||
    kind === "profile_prefs"
  );
}
