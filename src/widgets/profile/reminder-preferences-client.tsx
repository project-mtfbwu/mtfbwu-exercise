"use client";

import { useCallback, useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  deleteTrackerReminderAction,
  listTrackerRemindersAction,
  saveTrackerReminderAction,
} from "@/modules/trackers/actions";
import type { TrackerReminderView } from "@/modules/trackers/types";
import type { UserSupplementView } from "@/modules/supplements/types";
import type { UserTrackerView } from "@/modules/trackers/types";
import type { TrackerReminderType } from "@/shared/database/types";
import { useOnlineStore } from "@/shared/offline/online-store";
import {
  buildTrackerReminderWrites,
  queueTrackerMutation,
  TRACKER_ENTITY,
} from "@/shared/offline/tracker-outbox";
import { useSyncStatusStore } from "@/shared/offline/sync-status-store";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Props = {
  userId: string;
  timezone: string;
  initialReminders: TrackerReminderView[];
  trackers: UserTrackerView[];
  supplements: UserSupplementView[];
};

type FormState = {
  id?: string;
  reminderType: TrackerReminderType;
  userTrackerId: string;
  userSupplementId: string;
  localTime: string;
  daysOfWeek: number[];
  enabled: boolean;
};

const emptyForm = (): FormState => ({
  reminderType: "tracker",
  userTrackerId: "",
  userSupplementId: "",
  localTime: "09:00",
  daysOfWeek: [1, 2, 3, 4, 5],
  enabled: true,
});

export function ReminderPreferencesClient({
  userId,
  timezone,
  initialReminders,
  trackers,
  supplements,
}: Props) {
  const [reminders, setReminders] = useState(initialReminders);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnlineStore((s) => s.status) !== "offline";

  const reload = useCallback(async () => {
    const list = await listTrackerRemindersAction();
    setReminders(list);
  }, []);

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort((a, b) => a - b),
    }));
  }

  function startEdit(reminder: TrackerReminderView) {
    setForm({
      id: reminder.id,
      reminderType: reminder.reminderType,
      userTrackerId: reminder.userTrackerId ?? "",
      userSupplementId: reminder.userSupplementId ?? "",
      localTime: reminder.localTime,
      daysOfWeek: reminder.daysOfWeek,
      enabled: reminder.enabled,
    });
    setEditing(true);
    setError(null);
    setMessage(null);
  }

  function resetForm() {
    setForm(emptyForm());
    setEditing(false);
    setError(null);
  }

  function saveReminder() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const payload = {
        id: form.id,
        reminderType: form.reminderType,
        userTrackerId:
          form.reminderType === "tracker" ? form.userTrackerId || null : null,
        userSupplementId:
          form.reminderType === "supplement" ? form.userSupplementId || null : null,
        localTime: form.localTime,
        timezone,
        daysOfWeek: form.daysOfWeek,
        enabled: form.enabled,
      };

      if (!online) {
        const reminderId = form.id ?? crypto.randomUUID();
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.trackerReminder,
          entityId: reminderId,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.trackerReminder,
            writes: buildTrackerReminderWrites({
              reminderId,
              userId,
              userTrackerId: payload.userTrackerId,
              userSupplementId: payload.userSupplementId,
              localTime: payload.localTime,
              timezone: payload.timezone,
              daysOfWeek: payload.daysOfWeek,
              enabled: payload.enabled,
              reminderType: payload.reminderType,
            }),
          },
          trackerReminderDraft: {
            reminderId,
            payload,
          },
        });
        useSyncStatusStore
          .getState()
          .setPendingCount(useSyncStatusStore.getState().pendingCount + 1);
        const label =
          payload.reminderType === "bedtime"
            ? "Bedtime"
            : payload.reminderType === "wake"
              ? "Wake"
              : payload.reminderType === "supplement"
                ? (supplements.find((s) => s.id === payload.userSupplementId)
                    ?.displayName ?? "Supplement")
                : (trackers.find((t) => t.id === payload.userTrackerId)?.displayName ??
                  "Tracker");
        setReminders((prev) => {
          const next: TrackerReminderView = {
            id: reminderId,
            reminderType: payload.reminderType,
            userTrackerId: payload.userTrackerId,
            userSupplementId: payload.userSupplementId,
            localTime: payload.localTime,
            timezone: payload.timezone,
            daysOfWeek: payload.daysOfWeek,
            enabled: payload.enabled,
            label,
          };
          const idx = prev.findIndex((r) => r.id === reminderId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = next;
            return copy;
          }
          return [...prev, next].sort((a, b) => a.localTime.localeCompare(b.localTime));
        });
        setMessage("Saved reminder preference — queued offline until sync.");
        resetForm();
        return;
      }

      const result = await saveTrackerReminderAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await reload();
      setMessage(
        "Saved reminder preference — notification delivery arrives in a later release.",
      );
      resetForm();
    });
  }

  function toggleEnabled(reminder: TrackerReminderView) {
    startTransition(async () => {
      const nextEnabled = !reminder.enabled;
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.trackerReminder,
          entityId: reminder.id,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.trackerReminder,
            writes: buildTrackerReminderWrites({
              reminderId: reminder.id,
              userId,
              userTrackerId: reminder.userTrackerId,
              userSupplementId: reminder.userSupplementId,
              localTime: reminder.localTime,
              timezone: reminder.timezone,
              daysOfWeek: reminder.daysOfWeek,
              enabled: nextEnabled,
              reminderType: reminder.reminderType,
            }),
          },
          trackerReminderDraft: {
            reminderId: reminder.id,
            payload: { ...reminder, enabled: nextEnabled },
          },
        });
        setReminders((prev) =>
          prev.map((r) => (r.id === reminder.id ? { ...r, enabled: nextEnabled } : r)),
        );
        return;
      }
      const result = await saveTrackerReminderAction({
        id: reminder.id,
        reminderType: reminder.reminderType,
        userTrackerId: reminder.userTrackerId,
        userSupplementId: reminder.userSupplementId,
        localTime: reminder.localTime,
        timezone: reminder.timezone,
        daysOfWeek: reminder.daysOfWeek,
        enabled: nextEnabled,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await reload();
    });
  }

  function removeReminder(id: string) {
    startTransition(async () => {
      if (!online) {
        await queueTrackerMutation({
          userId,
          entityType: TRACKER_ENTITY.trackerReminder,
          entityId: id,
          payload: {
            kind: "tracker",
            entity: TRACKER_ENTITY.trackerReminder,
            writes: [{ table: "tracker_reminders", values: { id }, operation: "delete" }],
          },
        });
        setReminders((prev) => prev.filter((r) => r.id !== id));
        return;
      }
      const result = await deleteTrackerReminderAction({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await reload();
    });
  }

  function formatDays(days: number[]): string {
    if (days.length === 0) return "Every day";
    if (days.length === 7) return "Every day";
    return days.map((d) => DAY_LABELS[d]).join(", ");
  }

  return (
    <div className="mt-4 space-y-4 border-t-2 border-[var(--mt-ink)] pt-4">
      <h2 className="text-lg font-black uppercase">Reminder preferences</h2>
      <p className="text-xs text-[var(--mt-ink-muted)]">
        Saved reminder preference — notification delivery arrives in a later release.
      </p>
      {!online ? (
        <p role="status" className="text-sm text-[var(--mt-ink-muted)]">
          Offline — reminder changes queue locally until sync.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="font-bold text-[var(--mt-success)]">
          {message}
        </p>
      ) : null}

      {reminders.length === 0 ? (
        <p className="text-sm">No reminders saved yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 border-2 border-[var(--mt-ink)] px-2 py-2"
            >
              <div>
                <span className="font-bold">{r.label}</span>
                <span className="ml-2 text-[var(--mt-ink-muted)]">
                  {r.localTime} · {formatDays(r.daysOfWeek)} · {r.timezone}
                </span>
                {!r.enabled ? (
                  <span className="ml-2 text-xs text-[var(--mt-ink-muted)] uppercase">
                    (disabled)
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <PixelButton
                  tone="neutral"
                  disabled={pending}
                  onClick={() => startEdit(r)}
                >
                  Edit
                </PixelButton>
                <PixelButton
                  tone="neutral"
                  disabled={pending}
                  onClick={() => toggleEnabled(r)}
                >
                  {r.enabled ? "Disable" : "Enable"}
                </PixelButton>
                <PixelButton
                  tone="danger"
                  disabled={pending}
                  onClick={() => removeReminder(r.id)}
                >
                  Remove
                </PixelButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-2 border-dashed border-[var(--mt-ink-muted)] p-3">
        <h3 className="text-sm font-black uppercase">
          {editing ? "Edit reminder" : "Add reminder"}
        </h3>
        <label className="block text-sm font-bold">
          Type
          <select
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
            value={form.reminderType}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                reminderType: e.target.value as TrackerReminderType,
              }))
            }
          >
            <option value="tracker">Tracker</option>
            <option value="supplement">Supplement</option>
            <option value="bedtime">Bedtime</option>
            <option value="wake">Wake</option>
          </select>
        </label>
        {form.reminderType === "tracker" ? (
          <label className="block text-sm font-bold">
            Tracker
            <select
              className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
              value={form.userTrackerId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, userTrackerId: e.target.value }))
              }
            >
              <option value="">Choose tracker…</option>
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {form.reminderType === "supplement" ? (
          <label className="block text-sm font-bold">
            Supplement
            <select
              className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
              value={form.userSupplementId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, userSupplementId: e.target.value }))
              }
            >
              <option value="">Choose supplement…</option>
              {supplements.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="block text-sm font-bold">
          Local time
          <input
            type="time"
            className="mt-1 w-full border-2 border-[var(--mt-ink)] px-2 py-2"
            value={form.localTime}
            onChange={(e) => setForm((prev) => ({ ...prev, localTime: e.target.value }))}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-bold">Days of week</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {DAY_LABELS.map((label, index) => (
              <label key={label} className="flex items-center gap-1 text-xs font-bold">
                <input
                  type="checkbox"
                  checked={form.daysOfWeek.includes(index)}
                  onChange={() => toggleDay(index)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          Enabled
        </label>
        <div className="flex flex-wrap gap-2">
          <PixelButton tone="primary" loading={pending} onClick={saveReminder}>
            {editing ? "Update reminder" : "Save reminder"}
          </PixelButton>
          {editing ? (
            <PixelButton tone="neutral" disabled={pending} onClick={resetForm}>
              Cancel edit
            </PixelButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
