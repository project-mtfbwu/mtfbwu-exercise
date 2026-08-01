"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import {
  clampCropRect,
  fullImageCrop,
  MIN_CROP_SIZE_PX,
  rotateClockwise,
  rotateCounterClockwise,
  rotatedDisplaySize,
  transformCropForRotation,
  type CropRect,
  type RotationQuarterTurns,
} from "@/modules/nutrition/ocr/crop-rotate";
import type { ProgressCropSession } from "@/modules/progress-photos/image/progress-crop-session";

type DragMode = null | "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/**
 * Interactive rotate + crop editor for progress photos. Preview is canvas-drawn
 * (not CSS-rotated) so the crop rectangle stays aligned with displayed pixels.
 */
export function ProgressPhotoCropEditor({
  slotLabel,
  imageUrl,
  sourceWidth,
  sourceHeight,
  initialRotation = 0,
  initialCrop,
  onConfirm,
  onRetake,
  onChooseAnother,
  onCancel,
}: {
  slotLabel: string;
  imageUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  initialRotation?: RotationQuarterTurns;
  initialCrop?: CropRect;
  onConfirm: (session: ProgressCropSession) => void;
  onRetake: () => void;
  onChooseAnother: () => void;
  onCancel: () => void;
}) {
  const baseId = useId();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState<RotationQuarterTurns>(initialRotation);
  const [crop, setCrop] = useState<CropRect>(() => {
    const display = rotatedDisplaySize(sourceWidth, sourceHeight, initialRotation);
    return clampCropRect(
      initialCrop ?? fullImageCrop(display.width, display.height),
      display.width,
      display.height,
    );
  });
  const [drag, setDrag] = useState<DragMode>(null);
  const dragOrigin = useRef<{
    pointerX: number;
    pointerY: number;
    crop: CropRect;
  } | null>(null);

  const display = rotatedDisplaySize(sourceWidth, sourceHeight, rotation);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (cancelled) return;
      canvas.width = display.width;
      canvas.height = display.height;
      context.save();
      context.clearRect(0, 0, display.width, display.height);
      switch (rotation) {
        case 0:
          break;
        case 1:
          context.translate(display.width, 0);
          context.rotate(Math.PI / 2);
          break;
        case 2:
          context.translate(display.width, display.height);
          context.rotate(Math.PI);
          break;
        case 3:
          context.translate(0, display.height);
          context.rotate(-Math.PI / 2);
          break;
      }
      context.drawImage(image, 0, 0, sourceWidth, sourceHeight);
      context.restore();
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [display.height, display.width, imageUrl, rotation, sourceHeight, sourceWidth]);

  const applyRotation = useCallback(
    (next: RotationQuarterTurns) => {
      setCrop((previous) =>
        transformCropForRotation(previous, sourceWidth, sourceHeight, rotation, next),
      );
      setRotation(next);
    },
    [rotation, sourceHeight, sourceWidth],
  );

  function resetRotation() {
    applyRotation(0);
  }

  function resetCrop() {
    setCrop(fullImageCrop(display.width, display.height));
  }

  function setCropField(field: keyof CropRect, raw: string) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setCrop((previous) =>
      clampCropRect({ ...previous, [field]: parsed }, display.width, display.height),
    );
  }

  function onPointerDown(mode: DragMode, event: React.PointerEvent) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag(mode);
    dragOrigin.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      crop: { ...crop },
    };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag || !dragOrigin.current) return;
    const origin = dragOrigin.current;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const scaleX = display.width / Math.max(1, rect.width);
    const scaleY = display.height / Math.max(1, rect.height);
    const dx = (event.clientX - origin.pointerX) * scaleX;
    const dy = (event.clientY - origin.pointerY) * scaleY;
    const start = origin.crop;
    let next: CropRect = { ...start };

    if (drag === "move") {
      next = { ...start, x: start.x + dx, y: start.y + dy };
    } else {
      if (drag.includes("e")) next.width = start.width + dx;
      if (drag.includes("s")) next.height = start.height + dy;
      if (drag.includes("w")) {
        next.x = start.x + dx;
        next.width = start.width - dx;
      }
      if (drag.includes("n")) {
        next.y = start.y + dy;
        next.height = start.height - dy;
      }
    }
    setCrop(clampCropRect(next, display.width, display.height));
  }

  function onPointerUp(event: React.PointerEvent) {
    if (drag) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
    dragOrigin.current = null;
  }

  const cropLeftPct = (crop.x / display.width) * 100;
  const cropTopPct = (crop.y / display.height) * 100;
  const cropWidthPct = (crop.width / display.width) * 100;
  const cropHeightPct = (crop.height / display.height) * 100;

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">
        Rotate and crop your <span className="underline">{slotLabel}</span> progress
        photo. Only the cropped frame is saved — never the raw camera original.
      </p>

      <div
        ref={stageRef}
        className="relative mx-auto max-h-[min(60vh,28rem)] w-full max-w-lg touch-none overflow-hidden border-2 border-[var(--mt-ink)] bg-black"
        style={{ aspectRatio: `${display.width} / ${display.height}` }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`${slotLabel} crop preview`}
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain select-none"
          aria-hidden
        />
        <div
          className="absolute border-2 border-[var(--mt-neon-yellow)] bg-transparent"
          style={{
            left: `${cropLeftPct}%`,
            top: `${cropTopPct}%`,
            width: `${cropWidthPct}%`,
            height: `${cropHeightPct}%`,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
          }}
        >
          <button
            type="button"
            aria-label="Move crop"
            className="absolute inset-0 cursor-move touch-none bg-transparent"
            style={{ pointerEvents: "auto" }}
            onPointerDown={(event) => onPointerDown("move", event)}
          />
          {(
            [
              ["nw", "0%", "0%"],
              ["ne", "100%", "0%"],
              ["sw", "0%", "100%"],
              ["se", "100%", "100%"],
              ["n", "50%", "0%"],
              ["s", "50%", "100%"],
              ["w", "0%", "50%"],
              ["e", "100%", "50%"],
            ] as const
          ).map(([mode, left, top]) => (
            <button
              key={mode}
              type="button"
              aria-label={`Resize crop ${mode}`}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 border-2 border-[var(--mt-ink)] bg-[var(--mt-neon-yellow)]"
              style={{ left, top, pointerEvents: "auto" }}
              onPointerDown={(event) => onPointerDown(mode, event)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <PixelButton
          tone="neutral"
          onClick={() => applyRotation(rotateCounterClockwise(rotation))}
        >
          Rotate left
        </PixelButton>
        <PixelButton
          tone="neutral"
          onClick={() => applyRotation(rotateClockwise(rotation))}
        >
          Rotate right
        </PixelButton>
        <PixelButton tone="neutral" onClick={resetRotation}>
          Reset rotation
        </PixelButton>
        <PixelButton tone="neutral" onClick={resetCrop}>
          Reset crop
        </PixelButton>
      </div>

      <fieldset className="grid gap-2 border-2 border-[var(--mt-ink)] bg-white/80 p-2 sm:grid-cols-4">
        <legend className="px-1 text-xs font-extrabold uppercase">
          Crop (pixels) — keyboard fallback
        </legend>
        {(
          [
            ["x", "X", crop.x],
            ["y", "Y", crop.y],
            ["width", "Width", crop.width],
            ["height", "Height", crop.height],
          ] as const
        ).map(([field, label, value]) => (
          <label key={field} className="text-sm font-bold" htmlFor={`${baseId}-${field}`}>
            {label}
            <input
              id={`${baseId}-${field}`}
              inputMode="numeric"
              value={value}
              min={field === "width" || field === "height" ? MIN_CROP_SIZE_PX : 0}
              onChange={(event) => setCropField(field, event.target.value)}
              className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            />
          </label>
        ))}
      </fieldset>

      <p className="text-xs font-bold text-[var(--mt-ink)]/80">
        Image {display.width}×{display.height}px · crop {crop.width}×{crop.height}px · min{" "}
        {MIN_CROP_SIZE_PX}px
      </p>

      <div className="flex flex-wrap gap-2">
        <PixelButton
          tone="primary"
          onClick={() =>
            onConfirm({
              sourceWidth,
              sourceHeight,
              rotation,
              crop: clampCropRect(crop, display.width, display.height),
            })
          }
        >
          Confirm crop
        </PixelButton>
        <PixelButton tone="neutral" onClick={onRetake}>
          Retake
        </PixelButton>
        <PixelButton tone="neutral" onClick={onChooseAnother}>
          Choose another
        </PixelButton>
        <PixelButton tone="danger" onClick={onCancel}>
          Cancel
        </PixelButton>
      </div>

      <span className="sr-only" data-testid="crop-session-summary">
        {JSON.stringify({ rotation, crop, display })}
      </span>
    </div>
  );
}

/** Maps pointer position into image pixel space (exported for unit tests). */
export function mapClientToImagePixels(
  clientX: number,
  clientY: number,
  stage: { left: number; top: number; width: number; height: number },
  display: { width: number; height: number },
): { x: number; y: number } {
  const scaleX = display.width / Math.max(1, stage.width);
  const scaleY = display.height / Math.max(1, stage.height);
  return {
    x: (clientX - stage.left) * scaleX,
    y: (clientY - stage.top) * scaleY,
  };
}
