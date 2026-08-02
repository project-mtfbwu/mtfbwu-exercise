"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  createUserSupplementAction,
  deleteSupplementIntakeAction,
  listUserSupplementsAction,
  recordSupplementIntakeAction,
} from "@/modules/supplements/actions";
import { supplementChecklistForDate } from "@/modules/supplements/calculations/helpers";
import { SUPPLEMENT_SAFETY_COPY } from "@/modules/supplements/safety";
import type {
  SupplementDaySummary,
  UserSupplementView,
} from "@/modules/supplements/types";
import { useOnlineStore } from "@/shared/offline/online-store";
import {
  buildSupplementIntakeDeleteWrites,
  buildSupplementIntakeWrites,
  buildUserSupplementWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import type { OfflineRecordStatus } from "@/shared/offline/offline-record-status";
import { OfflineRecordStatusBadge } from "@/shared/ui/flat-lay/offline-record-status-badge";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

export type SupplementsFocusProps = {
  titleId: string;
  userId: string;
  localDate: string;
  dailyRecordId: string;
  supplementsDaySummary?: SupplementDaySummary;
  onSaved: (summary: string) => void;
  onCancel: () => void;
};

export function SupplementsFocus({
  titleId,
  userId,
  localDate,
  dailyRecordId,
  supplementsDaySummary,
  onSaved,
  onCancel,
}: SupplementsFocusProps) {
  const [supplements, setSupplements] = useState<UserSupplementView[]>([]);
  const [summary, setSummary] = useState(supplementsDaySummary);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recordStatus, setRecordStatus] = useState<OfflineRecordStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnlineStore((s) => s.status) !== "offline";
  const syncing = useSyncStatusStore((s) => s.status) === "syncing";
  const failedCount = useSyncStatusStore((s) => s.failedCount);

  const badgeStatus: OfflineRecordStatus | null = syncing
    ? "syncing"
    : failedCount > 0 && recordStatus === "queued"
      ? "failed"
      : recordStatus;

  const load = useCallback(async () => {
    const list = await listUserSupplementsAction();
    setSupplements(list.filter((s) => s.active));
  }, []);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load, startTransition]);

  const checklist = supplementChecklistForDate(
    summary ?? {
      activeSupplements: supplements,
      intakes: [],
      takenCount: 0,
      skippedCount: 0,
      totalActive: supplements.length,
    },
  );

  const intakeBySupplement = new Map(
    (summary?.intakes ?? []).map((i) => [i.userSupplementId, i]),
  );

  function clearIntake(supplementId: string) {
    const intake = intakeBySupplement.get(supplementId);
    if (!intake) return;
    setError(null);
    startTransition(async () => {
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.supplementIntake,
          entityId: intake.id,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.supplementIntake,
            writes: buildSupplementIntakeDeleteWrites({ intakeId: intake.id, userId }),
          },
        });
        const nextIntakes = (summary?.intakes ?? []).filter((i) => i.id !== intake.id);
        const nextSummary = {
          ...(summary ?? {
            activeSupplements: supplements,
            intakes: [],
            takenCount: 0,
            skippedCount: 0,
            totalActive: supplements.length,
          }),
          intakes: nextIntakes,
        };
        nextSummary.takenCount = nextIntakes.filter(
          (i) => i.status === "taken" || i.status === "partial",
        ).length;
        nextSummary.skippedCount = nextIntakes.filter(
          (i) => i.status === "skipped",
        ).length;
        setSummary(nextSummary);
        setRecordStatus("queued");
        return;
      }
      const result = await deleteSupplementIntakeAction({ id: intake.id });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      const nextIntakes = (summary?.intakes ?? []).filter((i) => i.id !== intake.id);
      const nextSummary = {
        ...(summary ?? {
          activeSupplements: supplements,
          intakes: [],
          takenCount: 0,
          skippedCount: 0,
          totalActive: supplements.length,
        }),
        intakes: nextIntakes,
      };
      nextSummary.takenCount = nextIntakes.filter(
        (i) => i.status === "taken" || i.status === "partial",
      ).length;
      nextSummary.skippedCount = nextIntakes.filter((i) => i.status === "skipped").length;
      setSummary(nextSummary);
      setRecordStatus("synced");
    });
  }

  function mark(supplementId: string, status: "taken" | "skipped") {
    setError(null);
    const supplement = supplements.find((s) => s.id === supplementId);
    startTransition(async () => {
      if (!online) {
        const intakeId = crypto.randomUUID();
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.supplementIntake,
          entityId: intakeId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.supplementIntake,
            writes: buildSupplementIntakeWrites({
              intakeId,
              userId,
              userSupplementId: supplementId,
              localDate,
              dailyRecordId,
              status,
              supplementName: supplement?.displayName ?? null,
            }),
          },
          supplementDraft: { intakeId, payload: { supplementId, status } },
        });
        const nextSummary = {
          ...(summary ?? {
            activeSupplements: supplements,
            intakes: [],
            takenCount: 0,
            skippedCount: 0,
            totalActive: supplements.length,
          }),
          intakes: [
            ...(summary?.intakes ?? []),
            {
              id: intakeId,
              userSupplementId: supplementId,
              localDate,
              takenAt: new Date().toISOString(),
              amount: null,
              unit: null,
              status,
              note: null,
            },
          ],
        };
        nextSummary.takenCount = nextSummary.intakes.filter(
          (i) => i.status === "taken" || i.status === "partial",
        ).length;
        nextSummary.skippedCount = nextSummary.intakes.filter(
          (i) => i.status === "skipped",
        ).length;
        setSummary(nextSummary);
        setRecordStatus("queued");
        onSaved(
          `${nextSummary.takenCount + nextSummary.skippedCount} of ${supplements.length} marked`,
        );
        return;
      }
      const result = await recordSupplementIntakeAction({
        userSupplementId: supplementId,
        localDate,
        dailyRecordId,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      const nextSummary = {
        ...(summary ?? {
          activeSupplements: supplements,
          intakes: [],
          takenCount: 0,
          skippedCount: 0,
          totalActive: supplements.length,
        }),
        intakes: [
          ...(summary?.intakes ?? []),
          {
            id: result.id ?? crypto.randomUUID(),
            userSupplementId: supplementId,
            localDate,
            takenAt: new Date().toISOString(),
            amount: null,
            unit: null,
            status,
            note: null,
          },
        ],
      };
      nextSummary.takenCount = nextSummary.intakes.filter(
        (i) => i.status === "taken" || i.status === "partial",
      ).length;
      nextSummary.skippedCount = nextSummary.intakes.filter(
        (i) => i.status === "skipped",
      ).length;
      setSummary(nextSummary);
      setRecordStatus("synced");
      onSaved(
        `${nextSummary.takenCount + nextSummary.skippedCount} of ${supplements.length} marked`,
      );
    });
  }

  function addSupplement() {
    const name = newName.trim();
    if (!name) {
      setError("Enter a supplement name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      if (!online) {
        const supplementId = crypto.randomUUID();
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.userSupplement,
          entityId: supplementId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.userSupplement,
            writes: buildUserSupplementWrites({
              supplementId,
              userId,
              customName: name,
            }),
          },
          userSupplementDraft: { supplementId, payload: { customName: name } },
        });
        setSupplements((prev) => [
          ...prev,
          {
            id: supplementId,
            supplementDefinitionId: null,
            customName: name,
            brand: null,
            servingAmount: null,
            servingUnit: null,
            instructionsText: null,
            active: true,
            displayName: name,
          },
        ]);
        setNewName("");
        setRecordStatus("queued");
        setMessageQueued();
        return;
      }
      const result = await createUserSupplementAction({ customName: name });
      if (!result.ok) {
        setError(result.error);
        setRecordStatus("failed");
        return;
      }
      setNewName("");
      setRecordStatus("synced");
      await load();
    });
  }

  function setMessageQueued() {
    onSaved("Supplement queued offline");
  }

  return (
    <FocusPanel
      title="Supplements"
      titleId={titleId}
      accent="lime"
      onClose={onCancel}
      footer={
        <PixelButton tone="primary" onClick={() => onSaved("Supplements updated")}>
          Done
        </PixelButton>
      }
    >
      <OfflineRecordStatusBadge status={badgeStatus} />
      <p className="mb-2 text-xs text-[var(--mt-ink-muted)]">
        {SUPPLEMENT_SAFETY_COPY.disclaimer}
      </p>
      <p className="mb-4 text-xs text-[var(--mt-ink-muted)]">
        {SUPPLEMENT_SAFETY_COPY.notDosageAdvice}
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="block text-sm font-bold">
          Add supplement
          <input
            className="mt-1 w-full min-w-[12rem] border-2 border-[var(--mt-ink)] px-2 py-2"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <PixelButton tone="neutral" disabled={pending} onClick={addSupplement}>
          Add
        </PixelButton>
      </div>
      {supplements.length === 0 ? (
        <p className="text-sm">No supplements configured. Add one above.</p>
      ) : (
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li
              key={item.supplementId}
              className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--mt-ink)] px-2 py-2"
            >
              <span className="font-bold">{item.displayName}</span>
              <div className="flex gap-2">
                <PixelButton
                  tone={item.status === "taken" ? "primary" : "neutral"}
                  disabled={pending}
                  onClick={() => mark(item.supplementId, "taken")}
                >
                  {SUPPLEMENT_SAFETY_COPY.takenLabel}
                </PixelButton>
                <PixelButton
                  tone={item.status === "skipped" ? "cyan" : "neutral"}
                  disabled={pending}
                  onClick={() => mark(item.supplementId, "skipped")}
                >
                  {SUPPLEMENT_SAFETY_COPY.skippedLabel}
                </PixelButton>
                {item.status !== "pending" ? (
                  <PixelButton
                    tone="neutral"
                    disabled={pending}
                    onClick={() => clearIntake(item.supplementId)}
                  >
                    Clear
                  </PixelButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
    </FocusPanel>
  );
}
