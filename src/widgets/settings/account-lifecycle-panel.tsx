"use client";

import { useState, useTransition } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  requestAccountDeletionAction,
  requestAccountExportAction,
} from "@/modules/account/actions";
import { getDatabase, resetDatabaseSingleton } from "@/shared/offline/db";

export function AccountLifecyclePanel({
  exportEnabled,
  deletionEnabled,
}: {
  exportEnabled: boolean;
  deletionEnabled: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  function exportData() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestAccountExportAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mtfbwu-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded. Keep it private.");
    });
  }

  function deleteAccount() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestAccountDeletionAction({ confirmation: confirm });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        await getDatabase().delete();
        resetDatabaseSingleton();
      } catch {
        /* local wipe best-effort */
      }
      setMessage(result.message);
      window.location.href = "/login";
    });
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="export-heading">
        <h3 id="export-heading" className="font-bold">
          Export your data
        </h3>
        <p className="mt-1 text-sm text-[var(--mt-ink-muted)]">
          Downloads a private JSON export including short-lived signed links for private
          files (photos/labels). Rate-limited. ZIP packaging is deferred.
        </p>
        <PixelButton
          className="mt-2"
          tone="neutral"
          disabled={!exportEnabled || pending}
          loading={pending}
          onClick={exportData}
        >
          Download export
        </PixelButton>
      </section>

      <section aria-labelledby="delete-heading">
        <h3 id="delete-heading" className="font-bold text-[var(--mt-danger)]">
          Delete account
        </h3>
        <p className="mt-1 text-sm text-[var(--mt-ink-muted)]">
          Permanently deletes your cloud data and private storage objects. This cannot be
          undone. Type <strong>DELETE</strong> to confirm.
        </p>
        <label className="mt-2 block text-sm font-bold" htmlFor="delete-confirm">
          Confirmation
        </label>
        <input
          id="delete-confirm"
          className="mt-1 min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
        />
        <PixelButton
          className="mt-2"
          tone="danger"
          disabled={!deletionEnabled || pending || confirm !== "DELETE"}
          loading={pending}
          onClick={deleteAccount}
        >
          Delete my account
        </PixelButton>
      </section>

      {error ? (
        <p role="alert" className="text-sm font-bold text-[var(--mt-danger)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm font-bold">
          {message}
        </p>
      ) : null}
    </div>
  );
}
