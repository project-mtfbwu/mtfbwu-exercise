"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FocusPanel } from "@/widgets/focus-layer/focus-panel";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { AppLink } from "@/shared/ui/app-link";
import { ROUTES } from "@/shared/config/constants";
import {
  createPhotoSetAction,
  uploadPhotoMetadataAction,
  buildPhotoStoragePathAction,
  replacePhotoSlotAction,
  loadPhotoSetForLocalDateAction,
  loadPhotoSetSlotIdentitiesAction,
} from "@/modules/progress-photos/actions";
import {
  PROGRESS_PHOTO_CAPTURE_HINT,
  PROGRESS_PHOTO_PRIVACY_BANNER,
} from "@/modules/progress-photos/safety";
import {
  assertUploadIsProcessedProgressPhoto,
  buildProcessedProgressPhotoFromCropSession,
  initialProgressCropSession,
  ObjectUrlRegistry,
  sha256Hex,
  type ProgressCropSession,
} from "@/modules/progress-photos/image/progress-crop-session";
import { MAX_PROGRESS_PHOTO_DIMENSION } from "@/modules/progress-photos/image/preprocess";
import { clearActiveProgressCameraStream } from "@/modules/progress-photos/camera/managed-camera";
import { orphanCleanupAfterConflict } from "@/modules/progress-photos/replacement";
import { PROGRESS_PHOTOS_BUCKET } from "@/shared/storage/paths";
import { createSupabaseBrowserClient } from "@/shared/database/client";
import type { ProgressDaySummary } from "@/modules/progress/load-progress-day";
import type { ProgressPhotoSlotIdentity } from "@/modules/progress-photos/types";
import {
  listProgressPhotoDrafts,
  queueProgressPhotoUpload,
} from "@/shared/offline/progress-outbox";
import type { ProgressPhotoDraft } from "@/shared/offline/db";
import { useOnlineStore } from "@/shared/offline/online-store";
import { ProgressPhotoCropEditor } from "@/widgets/progress/progress-photo-crop-editor";
import { ProgressCameraPanel } from "@/widgets/progress/progress-camera-panel";

const SLOTS = [
  { slot: "front" as const, label: "Front" },
  { slot: "side_left" as const, label: "Side (L)" },
  { slot: "side_right" as const, label: "Side (R)" },
  { slot: "back" as const, label: "Back" },
];

type Slot = (typeof SLOTS)[number]["slot"];
type Phase =
  | "idle"
  | "camera"
  | "picking"
  | "editing"
  | "quotaError"
  | "staleConflict"
  | "uploading";

type SourceImage = {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
};

type SlotPhotoMeta = {
  photoId: string;
  storagePath: string;
  checksum: string | null;
  updatedAt: string;
  signedUrl: string | null;
};

function isQuotaQueueFailure(
  result: Awaited<ReturnType<typeof queueProgressPhotoUpload>>,
): result is { ok: false; code: "quota"; message: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "ok" in result &&
    (result as { ok?: boolean }).ok === false
  );
}

function identitiesToSlotMap(
  slots: ProgressPhotoSlotIdentity[],
): Partial<Record<Slot, SlotPhotoMeta>> {
  const next: Partial<Record<Slot, SlotPhotoMeta>> = {};
  for (const identity of slots) {
    if (!SLOTS.some((entry) => entry.slot === identity.slot)) continue;
    next[identity.slot as Slot] = {
      photoId: identity.photoId,
      storagePath: identity.privateStoragePath,
      checksum: identity.checksum,
      updatedAt: identity.updatedAt,
      signedUrl: identity.signedUrl,
    };
  }
  return next;
}

export type ProgressPhotosFocusProps = {
  titleId: string;
  userId: string;
  localDate: string;
  timezone: string;
  /** When set, load this set instead of today's local-date set. */
  photoSetId?: string | null;
  progressDaySummary?: ProgressDaySummary;
  onSaved: (summary: string) => void;
  onCancel: () => void;
};

export function ProgressPhotosFocus({
  titleId,
  userId,
  localDate,
  timezone,
  photoSetId: photoSetIdProp = null,
  progressDaySummary,
  onSaved,
  onCancel,
}: ProgressPhotosFocusProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef(new ObjectUrlRegistry());
  const sourceBlobRef = useRef<Blob | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [activeSlot, setActiveSlot] = useState<Slot>("front");
  const [setId, setSetId] = useState<string | null>(photoSetIdProp);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [slotPhotos, setSlotPhotos] = useState<Partial<Record<Slot, SlotPhotoMeta>>>({});
  const [pendingDrafts, setPendingDrafts] = useState<ProgressPhotoDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const online = useOnlineStore((s) => s.status) !== "offline";

  const [availableSets, setAvailableSets] = useState<
    Array<{ id: string; localDate: string; title: string | null }>
  >([]);

  const applyLoadedSlots = useCallback((slots: ProgressPhotoSlotIdentity[]) => {
    setSlotPhotos(identitiesToSlotMap(slots));
  }, []);

  const refreshSlotIdentities = useCallback(
    async (targetSetId?: string | null) => {
      const id = targetSetId ?? setId ?? photoSetIdProp;
      if (id) {
        const loaded = await loadPhotoSetSlotIdentitiesAction(id);
        setSetId(loaded.setId);
        applyLoadedSlots(loaded.slots);
        return loaded;
      }
      const byDate = await loadPhotoSetForLocalDateAction(localDate);
      setSetId(byDate.setId);
      applyLoadedSlots(byDate.slots);
      return byDate;
    },
    [applyLoadedSlots, localDate, photoSetIdProp, setId],
  );

  useEffect(() => {
    void listProgressPhotoDrafts(userId)
      .then(setPendingDrafts)
      .catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void (async () => {
        try {
          const { listPhotoSetsAction } =
            await import("@/modules/progress-photos/actions");
          const sets = await listPhotoSetsAction(30);
          if (!cancelled) {
            setAvailableSets(
              sets.map((set) => ({
                id: set.id,
                localDate: set.localDate,
                title: set.title,
              })),
            );
          }
          if (photoSetIdProp) {
            const loaded = await loadPhotoSetSlotIdentitiesAction(photoSetIdProp);
            if (cancelled) return;
            setSetId(loaded.setId);
            applyLoadedSlots(loaded.slots);
            return;
          }
          const byDate = await loadPhotoSetForLocalDateAction(localDate);
          if (cancelled) return;
          setSetId(byDate.setId);
          applyLoadedSlots(byDate.slots);
        } catch {
          if (!cancelled) {
            setError("Could not load existing progress photos for this set.");
          }
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [applyLoadedSlots, localDate, photoSetIdProp]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.revokeAll();
      clearActiveProgressCameraStream();
    };
  }, []);

  async function ensureSet(): Promise<string> {
    if (setId) return setId;
    const result = await createPhotoSetAction({ localDate, timezone });
    if (!result.ok)
      throw new Error("error" in result ? result.error : "Could not create set.");
    if (!result.id) throw new Error("Could not create set.");
    setSetId(result.id);
    return result.id;
  }

  function resetEditingState() {
    if (source?.previewUrl) urlsRef.current.revoke(source.previewUrl);
    setSource(null);
    sourceBlobRef.current = null;
  }

  function cancelEditing() {
    resetEditingState();
    setError(null);
    setPhase("idle");
  }

  async function loadSourceFromBlob(blob: Blob) {
    setError(null);
    resetEditingState();
    const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas 2D context is unavailable");
      context.drawImage(bitmap, 0, 0);
      const upright = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Could not read image")),
          "image/jpeg",
          0.92,
        );
      });
      canvas.width = 0;
      canvas.height = 0;
      sourceBlobRef.current = upright;
      const previewUrl = urlsRef.current.create(upright);
      setSource({
        blob: upright,
        width: bitmap.width,
        height: bitmap.height,
        previewUrl,
      });
      setPhase("editing");
    } finally {
      bitmap.close();
    }
  }

  async function handleFrameCaptured(blob: Blob) {
    await loadSourceFromBlob(blob);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setPhase("picking");
    startTransition(async () => {
      try {
        await loadSourceFromBlob(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load image.");
        setPhase("idle");
      }
    });
  }

  async function removeStoragePath(path: string) {
    const client = createSupabaseBrowserClient();
    await client.storage
      .from(PROGRESS_PHOTOS_BUCKET)
      .remove([path])
      .catch(() => undefined);
  }

  async function uploadProcessedPhoto(options: {
    blob: Blob;
    width: number;
    height: number;
    checksum: string;
    session: ProgressCropSession;
    retrySmaller?: boolean;
  }) {
    const sid = await ensureSet();
    // Refresh server identities so previousPhotoId survives refresh / other devices.
    const loaded = await refreshSlotIdentities(sid);
    const slots = "slots" in loaded ? loaded.slots : ([] as ProgressPhotoSlotIdentity[]);
    const freshMap = identitiesToSlotMap(slots);
    const existing = freshMap[activeSlot] ?? slotPhotos[activeSlot];

    const pathResult = await buildPhotoStoragePathAction({
      setId: sid,
      slot: activeSlot,
    });

    if (!online) {
      const queueOnce = async (
        blob: Blob,
        width: number,
        height: number,
        checksum: string,
      ) =>
        queueProgressPhotoUpload({
          userId,
          setId: sid,
          photoId: pathResult.photoId,
          localDate,
          timezone,
          slot: activeSlot,
          storagePath: pathResult.path,
          mimeType: "image/jpeg",
          blob,
          width,
          height,
          checksum,
          createSet: !setId,
        });

      const queueResult = await queueOnce(
        options.blob,
        options.width,
        options.height,
        options.checksum,
      );
      if (isQuotaQueueFailure(queueResult) && !options.retrySmaller) {
        const smaller = await buildProcessedProgressPhotoFromCropSession({
          source: sourceBlobRef.current!,
          session: options.session,
          maxDimension: Math.min(1280, MAX_PROGRESS_PHOTO_DIMENSION),
          quality: 0.75,
        });
        assertUploadIsProcessedProgressPhoto(smaller.preprocessed);
        const smallerChecksum = await sha256Hex(smaller.uploadBlob);
        await uploadProcessedPhoto({
          blob: smaller.uploadBlob,
          width: smaller.preprocessed.width,
          height: smaller.preprocessed.height,
          checksum: smallerChecksum,
          session: options.session,
          retrySmaller: true,
        });
        return;
      }
      if (isQuotaQueueFailure(queueResult)) {
        setPhase("quotaError");
        setError(queueResult.message);
        return;
      }
      setSetId(sid);
      setSlotPhotos((previous) => ({
        ...previous,
        [activeSlot]: {
          photoId: pathResult.photoId,
          storagePath: pathResult.path,
          checksum: options.checksum,
          updatedAt: new Date().toISOString(),
          signedUrl: null,
        },
      }));
      const drafts = await listProgressPhotoDrafts(userId);
      setPendingDrafts(drafts);
      resetEditingState();
      setPhase("idle");
      onSaved(`${activeSlot} photo queued offline`);
      return;
    }

    const client = createSupabaseBrowserClient();
    const { error: uploadError } = await client.storage
      .from(PROGRESS_PHOTOS_BUCKET)
      .upload(pathResult.path, options.blob, {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (uploadError) throw new Error(uploadError.message);

    const metadataInput = {
      setId: sid,
      photoId: pathResult.photoId,
      slot: activeSlot,
      storagePath: pathResult.path,
      mimeType: "image/jpeg" as const,
      width: options.width,
      height: options.height,
      fileSizeBytes: options.blob.size,
      checksum: options.checksum,
    };

    const meta = existing
      ? await replacePhotoSlotAction({
          ...metadataInput,
          previousPhotoId: existing.photoId,
        })
      : await uploadPhotoMetadataAction(metadataInput);

    if (!meta.ok) {
      const cleanup = orphanCleanupAfterConflict({
        metadataSucceeded: false,
        hadStaleConflict: meta.code === "stale" || meta.code === "missing_previous",
      });
      if (cleanup.shouldDeleteNewStorageObject) {
        await removeStoragePath(pathResult.path);
      }
      if (meta.code === "stale" || meta.code === "missing_previous") {
        await refreshSlotIdentities(sid);
        setError(meta.error);
        setPhase("staleConflict");
        return;
      }
      throw new Error(meta.error);
    }

    const cleanup = orphanCleanupAfterConflict({
      metadataSucceeded: true,
      hadStaleConflict: false,
    });
    const oldPath =
      meta.previousStoragePath ??
      (existing && existing.storagePath !== pathResult.path
        ? existing.storagePath
        : null);
    if (cleanup.shouldDeleteOldStorageObject && oldPath) {
      await removeStoragePath(oldPath);
    }

    setSetId(sid);
    await refreshSlotIdentities(sid);
    resetEditingState();
    setPhase("idle");
    onSaved(`${activeSlot} photo saved`);
  }

  function handleConfirmCrop(session: ProgressCropSession) {
    if (!sourceBlobRef.current) return;
    setError(null);
    setPhase("uploading");
    startTransition(async () => {
      try {
        const processed = await buildProcessedProgressPhotoFromCropSession({
          source: sourceBlobRef.current!,
          session,
        });
        assertUploadIsProcessedProgressPhoto(processed.preprocessed);
        const checksum = await sha256Hex(processed.uploadBlob);
        await uploadProcessedPhoto({
          blob: processed.uploadBlob,
          width: processed.preprocessed.width,
          height: processed.preprocessed.height,
          checksum,
          session,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setPhase("editing");
      }
    });
  }

  function handleRefreshSlots() {
    setError(null);
    startTransition(async () => {
      try {
        await refreshSlotIdentities();
        setPhase("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not refresh.");
      }
    });
  }

  const activeSlotLabel =
    SLOTS.find((slot) => slot.slot === activeSlot)?.label ?? activeSlot;
  const activeIdentity = slotPhotos[activeSlot];

  return (
    <FocusPanel
      title="Progress photos"
      titleId={titleId}
      accent="pink"
      onClose={() => {
        cancelEditing();
        clearActiveProgressCameraStream();
        onCancel();
      }}
      footer={
        phase === "idle" || phase === "quotaError" || phase === "staleConflict" ? (
          <>
            <PixelButton
              tone="primary"
              onClick={() => setPhase("camera")}
              disabled={pending}
            >
              Open camera
            </PixelButton>
            <PixelButton
              tone="neutral"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
            >
              Choose file
            </PixelButton>
            <PixelButton tone="danger" onClick={onCancel} disabled={pending}>
              Close
            </PixelButton>
          </>
        ) : phase === "editing" ? null : (
          <PixelButton tone="danger" onClick={cancelEditing} disabled={pending}>
            Back
          </PixelButton>
        )
      }
    >
      <p className="mb-2 text-xs font-bold text-[var(--mt-ink)]">
        {PROGRESS_PHOTO_PRIVACY_BANNER}
      </p>
      <p className="mb-3 text-xs text-[var(--mt-ink-muted)]">
        {PROGRESS_PHOTO_CAPTURE_HINT}
      </p>
      {progressDaySummary?.photoSetCount ? (
        <p className="mb-2 text-sm">
          {progressDaySummary.photoSetCount} set(s) logged today.
        </p>
      ) : null}
      {setId ? (
        <p className="mb-2 text-xs text-[var(--mt-ink-muted)]">
          Editing set {setId.slice(0, 8)}… · server-backed slot ids loaded
        </p>
      ) : null}
      {availableSets.length > 0 ? (
        <label className="mb-3 block text-sm font-bold" htmlFor="progress-photo-set">
          Photo set
          <select
            id="progress-photo-set"
            className="mt-1 min-h-11 w-full border-2 border-[var(--mt-ink)] px-2"
            value={setId ?? ""}
            onChange={(event) => {
              const nextId = event.target.value || null;
              setError(null);
              startTransition(async () => {
                if (!nextId) {
                  setSetId(null);
                  setSlotPhotos({});
                  return;
                }
                await refreshSlotIdentities(nextId);
              });
            }}
          >
            <option value="">New set for {localDate}</option>
            {availableSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.localDate}
                {set.title ? ` · ${set.title}` : ""} · {set.id.slice(0, 8)}…
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {pendingDrafts.length > 0 ? (
        <div className="mb-3 border-2 border-[var(--mt-ink)] bg-[var(--mt-accent-pink)]/20 p-2 text-sm">
          <p className="font-bold">
            {pendingDrafts.length} photo draft(s) waiting to sync
          </p>
          <ul className="mt-1 list-disc pl-5">
            {pendingDrafts.slice(0, 5).map((draft) => {
              const payload = draft.payload as {
                slot?: string;
                byteLength?: number;
              } | null;
              return (
                <li key={draft.id}>
                  {payload?.slot ?? "photo"} ·{" "}
                  {payload?.byteLength
                    ? `${Math.round(payload.byteLength / 1024)} KB`
                    : "pending"}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {error ? (
        <p
          className="mb-2 text-sm font-bold text-[var(--mt-ink-danger,var(--mt-danger))]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {phase === "staleConflict" ? (
        <div className="mb-3 space-y-2 border-2 border-[var(--mt-ink)] p-2">
          <p className="text-sm">
            Another device or session updated this slot. The newer saved photo was left
            untouched. Your upload was not applied.
          </p>
          <div className="flex flex-wrap gap-2">
            <PixelButton tone="primary" onClick={handleRefreshSlots} loading={pending}>
              Refresh
            </PixelButton>
            <PixelButton
              tone="neutral"
              onClick={() => {
                setPhase("idle");
                setError(null);
              }}
            >
              Retry later
            </PixelButton>
          </div>
        </div>
      ) : null}
      {phase === "quotaError" ? (
        <div className="mb-3 space-y-2">
          <p className="text-sm">
            Device storage is full. Sync when online, remove other offline drafts, or
            retry with a smaller crop.
          </p>
          <div className="flex flex-wrap gap-2">
            <PixelButton tone="primary" onClick={() => setPhase("camera")}>
              Retry capture
            </PixelButton>
            <PixelButton tone="neutral" onClick={() => fileRef.current?.click()}>
              Choose smaller file
            </PixelButton>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {SLOTS.map((slot) => (
          <button
            key={slot.slot}
            type="button"
            className={`border-2 px-2 py-1 text-sm ${
              activeSlot === slot.slot
                ? "border-[var(--mt-ink)] bg-[var(--mt-accent-pink)] font-bold"
                : "border-[var(--mt-ink-muted)]"
            } ${slotPhotos[slot.slot] ? "underline" : ""}`}
            onClick={() => setActiveSlot(slot.slot)}
            disabled={phase === "uploading"}
            aria-pressed={activeSlot === slot.slot}
          >
            {slot.label}
            {slotPhotos[slot.slot] ? " ✓" : ""}
          </button>
        ))}
      </div>
      {activeIdentity ? (
        <p className="mt-2 text-xs text-[var(--mt-ink-muted)]">
          Active {activeSlotLabel} photo id {activeIdentity.photoId.slice(0, 8)}… ·
          updated {activeIdentity.updatedAt}
        </p>
      ) : null}
      {activeIdentity?.signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL preview
        <img
          src={activeIdentity.signedUrl}
          alt={`Saved ${activeSlotLabel} progress photo`}
          className="mt-2 max-h-32 border-2 border-[var(--mt-ink)] object-contain"
        />
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      {phase === "camera" ? (
        <div className="mt-3">
          <ProgressCameraPanel
            onFrameCaptured={(blob) => void handleFrameCaptured(blob)}
            onClose={() => setPhase("idle")}
            onPickFile={() => {
              setPhase("picking");
              fileRef.current?.click();
            }}
          />
        </div>
      ) : null}

      {phase === "editing" && source ? (
        <div className="mt-3">
          <ProgressPhotoCropEditor
            slotLabel={activeSlotLabel}
            imageUrl={source.previewUrl}
            sourceWidth={source.width}
            sourceHeight={source.height}
            initialCrop={initialProgressCropSession(source.width, source.height).crop}
            onConfirm={handleConfirmCrop}
            onRetake={() => setPhase("camera")}
            onChooseAnother={() => {
              setPhase("picking");
              fileRef.current?.click();
            }}
            onCancel={cancelEditing}
          />
        </div>
      ) : null}

      {phase === "uploading" ? (
        <p className="mt-3 text-sm font-bold">Uploading processed photo…</p>
      ) : null}

      <p className="mt-3 text-sm">
        Full timeline on <AppLink href={ROUTES.progress}>Progress</AppLink>.
      </p>
    </FocusPanel>
  );
}
