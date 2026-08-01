"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getPhotoSignedUrlByIdAction } from "@/modules/progress-photos/actions";
import type {
  ProgressPhotoSetView,
  ProgressPhotoSlot,
} from "@/modules/progress-photos/types";
import { PROGRESS_DATA_DISCLAIMER } from "@/modules/progress-photos/safety";

const COMPARE_SLOTS: { slot: ProgressPhotoSlot; label: string }[] = [
  { slot: "front", label: "Front" },
  { slot: "side_left", label: "Side (L)" },
  { slot: "side_right", label: "Side (R)" },
  { slot: "back", label: "Back" },
];

type PhotoPanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; url: string; alt: string }
  | { status: "missing"; message: string }
  | { status: "error"; message: string };

function findPhoto(set: ProgressPhotoSetView | null, slot: ProgressPhotoSlot) {
  if (!set) return null;
  return set.photos.find((p) => p.slot === slot) ?? null;
}

function ComparisonPanel({
  label,
  date,
  state,
}: {
  label: string;
  date: string | null;
  state: PhotoPanelState;
}) {
  return (
    <figure className="flex flex-1 flex-col gap-2">
      <figcaption className="text-sm font-bold">
        {label}
        {date ? ` · ${date}` : ""}
      </figcaption>
      <div className="flex min-h-48 items-center justify-center border-2 border-[var(--mt-ink)] bg-[var(--mt-surface)] p-2">
        {state.status === "loading" ? (
          <p className="text-sm text-[var(--mt-ink-muted)]">Loading private photo…</p>
        ) : null}
        {state.status === "ready" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.url}
            alt={state.alt}
            className="max-h-80 max-w-full object-contain"
          />
        ) : null}
        {state.status === "missing" ? (
          <p className="text-center text-sm text-[var(--mt-ink-muted)]" role="status">
            {state.message}
          </p>
        ) : null}
        {state.status === "error" ? (
          <p className="text-center text-sm text-[var(--mt-danger)]" role="alert">
            {state.message}
          </p>
        ) : null}
        {state.status === "idle" ? (
          <p className="text-sm text-[var(--mt-ink-muted)]">Select a photo set.</p>
        ) : null}
      </div>
    </figure>
  );
}

export type PhotoComparisonViewerProps = {
  photoSets: ProgressPhotoSetView[];
};

export function PhotoComparisonViewer({ photoSets }: PhotoComparisonViewerProps) {
  const [leftSetId, setLeftSetId] = useState("");
  const [rightSetId, setRightSetId] = useState("");
  const [slot, setSlot] = useState<ProgressPhotoSlot>("front");
  const [leftState, setLeftState] = useState<PhotoPanelState>({ status: "idle" });
  const [rightState, setRightState] = useState<PhotoPanelState>({ status: "idle" });

  const leftSet = useMemo(
    () => photoSets.find((s) => s.id === leftSetId) ?? null,
    [photoSets, leftSetId],
  );
  const rightSet = useMemo(
    () => photoSets.find((s) => s.id === rightSetId) ?? null,
    [photoSets, rightSetId],
  );

  const loadPanel = useCallback(
    async (
      set: ProgressPhotoSetView | null,
      sideLabel: string,
      setter: (s: PhotoPanelState) => void,
    ) => {
      if (!set) {
        setter({ status: "idle" });
        return;
      }
      const photo = findPhoto(set, slot);
      if (!photo) {
        setter({
          status: "missing",
          message: `No ${slot.replaceAll("_", " ")} photo in this set.`,
        });
        return;
      }
      if (!photo.processed) {
        setter({
          status: "missing",
          message: "Photo still processing or unavailable.",
        });
        return;
      }
      setter({ status: "loading" });
      const result = await getPhotoSignedUrlByIdAction(photo.id);
      if (!result.ok || !result.signedUrl) {
        setter({
          status: "error",
          message: "error" in result ? result.error : "Could not load photo.",
        });
        return;
      }
      setter({
        status: "ready",
        url: result.signedUrl,
        alt: `${sideLabel} progress photo on ${set.localDate}, ${slot} view`,
      });
    },
    [slot],
  );

  useEffect(() => {
    void loadPanel(leftSet, "Earlier", setLeftState);
  }, [leftSet, loadPanel]);

  useEffect(() => {
    void loadPanel(rightSet, "Later", setRightState);
  }, [rightSet, loadPanel]);

  if (photoSets.length < 2) {
    return (
      <p className="text-sm text-[var(--mt-ink-muted)]">
        Log at least two photo sets to compare side by side.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--mt-ink-muted)]">{PROGRESS_DATA_DISCLAIMER}</p>
      <div className="flex flex-wrap gap-2">
        <label className="text-sm font-bold">
          Earlier set
          <select
            className="ml-2 min-h-9 border-2 border-[var(--mt-ink)] px-2 text-sm font-normal"
            value={leftSetId}
            onChange={(e) => setLeftSetId(e.target.value)}
            aria-label="Earlier photo set"
          >
            <option value="">Choose…</option>
            {photoSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.localDate}
                {s.title ? ` · ${s.title}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          Later set
          <select
            className="ml-2 min-h-9 border-2 border-[var(--mt-ink)] px-2 text-sm font-normal"
            value={rightSetId}
            onChange={(e) => setRightSetId(e.target.value)}
            aria-label="Later photo set"
          >
            <option value="">Choose…</option>
            {photoSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.localDate}
                {s.title ? ` · ${s.title}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Comparison slot">
        {COMPARE_SLOTS.map((s) => (
          <button
            key={s.slot}
            type="button"
            className={`border-2 px-2 py-1 text-sm ${
              slot === s.slot
                ? "border-[var(--mt-ink)] bg-[var(--mt-accent-cyan)] font-bold"
                : "border-[var(--mt-ink-muted)]"
            }`}
            aria-pressed={slot === s.slot}
            onClick={() => setSlot(s.slot)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div
        className="grid gap-4 md:grid-cols-2"
        role="region"
        aria-label="Side-by-side photo comparison"
      >
        <ComparisonPanel
          label="Earlier"
          date={leftSet?.localDate ?? null}
          state={leftState}
        />
        <ComparisonPanel
          label="Later"
          date={rightSet?.localDate ?? null}
          state={rightState}
        />
      </div>
    </div>
  );
}
