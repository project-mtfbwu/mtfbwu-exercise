"use client";

import { useEffect, useRef, useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { ProgressMeter } from "@/shared/ui/flat-lay/progress-meter";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { createSupabaseBrowserClient } from "@/shared/database/client";
import { buildNutritionLabelPath, NUTRITION_LABELS_BUCKET } from "@/shared/storage/paths";
import {
  createLabelCaptureAction,
  discardLabelCaptureAction,
  recordLabelCaptureOcrAction,
} from "@/modules/nutrition/labels/actions";
import {
  LabelImageTooLargeError,
  parseLabelText,
  type ExtractedNutritionField,
  type OcrAdapter,
  type OcrProgress,
} from "@/modules/nutrition/ocr";
import {
  assertUploadIsProcessedCrop,
  buildOcrInputFromCropSession,
  initialCropSession,
  type LabelCropSession,
} from "@/modules/nutrition/ocr/label-crop-session";
import { ObjectUrlRegistry } from "@/modules/nutrition/ocr/object-url-registry";
import {
  rotateClockwise,
  transformCropForRotation,
  type RotationQuarterTurns,
} from "@/modules/nutrition/ocr/crop-rotate";
import type { MacroNutrients } from "@/modules/nutrition/calculations";
import { LabelImageCropEditor } from "./label-image-crop-editor";
import { LabelReviewForm } from "./label-review-form";

type CaptureStep = "pick" | "edit" | "processing" | "review";

type SourceImage = {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
};

/**
 * Photo → crop/rotate → OCR → review. Nested meal-focus RetroWindow.
 * Uploads only the processed crop (never the raw camera original).
 * OCR retries reuse one capture row and preserve barcode.
 */
export function LabelCapturePanel({
  titleId,
  barcode,
  onClose,
  onSaved,
}: {
  titleId: string;
  barcode?: string | null;
  onClose: () => void;
  onSaved: (
    foodId: string,
    name: string,
    per100g: MacroNutrients,
    servingGrams: number,
  ) => void;
}) {
  const [step, setStep] = useState<CaptureStep>("pick");
  const [source, setSource] = useState<SourceImage | null>(null);
  const [cropSession, setCropSession] = useState<LabelCropSession | null>(null);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [extractedFields, setExtractedFields] = useState<ExtractedNutritionField[]>([]);
  const [manualEntry, setManualEntry] = useState(false);
  const [editGeneration, setEditGeneration] = useState(0);

  const captureIdRef = useRef<string | null>(null);
  const ocrAdapterRef = useRef<OcrAdapter | null>(null);
  const urlsRef = useRef(new ObjectUrlRegistry());
  const sourceBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.revokeAll();
      void ocrAdapterRef.current?.terminate();
      ocrAdapterRef.current = null;
    };
  }, []);

  async function loadSourceFromFile(file: File | null) {
    setError(null);
    if (source?.previewUrl) urlsRef.current.revoke(source.previewUrl);
    setSource(null);
    setCropSession(null);
    sourceBlobRef.current = null;
    if (!file) {
      setStep("pick");
      return;
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      try {
        // Re-encode once so EXIF is applied and stripped for the session source.
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D context is unavailable");
        context.drawImage(bitmap, 0, 0);
        const upright = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Could not read image"))),
            "image/jpeg",
            0.92,
          );
        });
        canvas.width = 0;
        canvas.height = 0;
        const previewUrl = urlsRef.current.create(upright);
        sourceBlobRef.current = upright;
        setSource({
          blob: upright,
          width: bitmap.width,
          height: bitmap.height,
          previewUrl,
        });
        setCropSession(initialCropSession(bitmap.width, bitmap.height));
        setEditGeneration((value) => value + 1);
        setStep("edit");
      } finally {
        bitmap.close();
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not open that image.",
      );
      setStep("pick");
    }
  }

  async function terminateOcrWorker() {
    const adapter = ocrAdapterRef.current;
    ocrAdapterRef.current = null;
    if (adapter) await adapter.terminate();
  }

  async function discardCaptureRecord() {
    const id = captureIdRef.current;
    captureIdRef.current = null;
    setCaptureId(null);
    if (id) {
      await discardLabelCaptureAction({ captureId: id }).catch(() => undefined);
    }
  }

  async function cancel() {
    await terminateOcrWorker();
    await discardCaptureRecord();
    urlsRef.current.revokeAll();
    sourceBlobRef.current = null;
    onClose();
  }

  function retake() {
    void terminateOcrWorker();
    if (source?.previewUrl) urlsRef.current.revoke(source.previewUrl);
    setSource(null);
    setCropSession(null);
    sourceBlobRef.current = null;
    setExtractedFields([]);
    setRawText("");
    setManualEntry(false);
    setError(null);
    setStep("pick");
  }

  async function ensureCaptureId(): Promise<string> {
    if (captureIdRef.current) return captureIdRef.current;
    const captureResult = await createLabelCaptureAction({
      barcode: barcode ?? undefined,
    });
    if (!captureResult.ok) throw new Error(captureResult.error);
    captureIdRef.current = captureResult.captureId;
    setCaptureId(captureResult.captureId);
    return captureResult.captureId;
  }

  async function runOcr(session: LabelCropSession) {
    const sourceBlob = sourceBlobRef.current;
    if (!sourceBlob) {
      setError("Missing label image. Choose a photo again.");
      setStep("pick");
      return;
    }
    setCropSession(session);
    setError(null);
    setManualEntry(false);
    setStep("processing");
    setProgress({ status: "starting", progress: 0 });
    try {
      await terminateOcrWorker();
      const { cropped, ocrBlob } = await buildOcrInputFromCropSession({
        source: sourceBlob,
        session,
      });
      assertUploadIsProcessedCrop(cropped);

      const id = await ensureCaptureId();

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let privateImagePath: string | null = null;
      if (user) {
        privateImagePath = buildNutritionLabelPath({
          userId: user.id,
          captureId: id,
          extension: "jpg",
        });
        const { error: uploadError } = await supabase.storage
          .from(NUTRITION_LABELS_BUCKET)
          .upload(privateImagePath, ocrBlob, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (uploadError) {
          throw new Error(
            uploadError.message || "Could not store label image privately.",
          );
        }
      }

      const { createTesseractOcrAdapter } =
        await import("@/modules/nutrition/ocr/tesseract-adapter");
      const adapter = createTesseractOcrAdapter();
      ocrAdapterRef.current = adapter;
      await adapter.initialize();
      const result = await adapter.recognize(ocrBlob, (next) => setProgress(next));
      // Keep adapter until explicit terminate on retry/close so cancel works mid-flight.
      ocrAdapterRef.current = adapter;

      const fields = parseLabelText(result.text);
      const meanConfidence =
        fields.length > 0
          ? fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length
          : null;

      const recordResult = await recordLabelCaptureOcrAction({
        captureId: id,
        privateImagePath,
        ocrText: result.text,
        extractionJson: { fields },
        language: "eng",
        confidenceSummary: meanConfidence,
      });
      if (!recordResult.ok) throw new Error(recordResult.error);

      setRawText(result.text);
      setExtractedFields(fields);
      setStep("review");
    } catch (ocrError) {
      await terminateOcrWorker();
      setStep(sourceBlobRef.current ? "edit" : "pick");
      setError(
        ocrError instanceof LabelImageTooLargeError
          ? ocrError.message
          : ocrError instanceof Error
            ? ocrError.message
            : "Could not process that photo. Try again.",
      );
    }
  }

  async function beginRecrop(options?: { nudgeRotate?: boolean }) {
    await terminateOcrWorker();
    setError(null);
    setManualEntry(false);
    if (!source || !cropSession) {
      setStep("pick");
      return;
    }
    if (options?.nudgeRotate) {
      const nextRotation = rotateClockwise(cropSession.rotation) as RotationQuarterTurns;
      setCropSession({
        ...cropSession,
        rotation: nextRotation,
        crop: transformCropForRotation(
          cropSession.crop,
          cropSession.sourceWidth,
          cropSession.sourceHeight,
          cropSession.rotation,
          nextRotation,
        ),
      });
    }
    setStep("edit");
    setEditGeneration((value) => value + 1);
  }

  function useTextAnyway() {
    setManualEntry(false);
    setError(null);
  }

  function enterValuesManually() {
    setExtractedFields([]);
    setRawText("");
    setManualEntry(true);
    setError(null);
  }

  return (
    <RetroWindow
      title="Scan label"
      titleId={titleId}
      accent="orange"
      onClose={() => void cancel()}
    >
      {step === "pick" ? (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-neon-yellow)]/40 p-3 text-sm font-bold">
            <p className="font-extrabold uppercase">Capture tips</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 font-bold">
              <li>Keep the label flat</li>
              <li>Fill the frame with the nutrition panel</li>
              <li>Avoid glare and shadows</li>
              <li>Photograph straight-on (no perspective correction in-app)</li>
            </ul>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm font-bold" htmlFor="label-capture-photo">
              Take photo
              <input
                id="label-capture-photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) =>
                  void loadSourceFromFile(event.target.files?.[0] ?? null)
                }
                className="mt-1 block w-full border-2 border-[var(--mt-ink)] bg-white px-2 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-bold" htmlFor="label-capture-file">
              Choose file
              <input
                id="label-capture-file"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  void loadSourceFromFile(event.target.files?.[0] ?? null)
                }
                className="mt-1 block w-full border-2 border-[var(--mt-ink)] bg-white px-2 py-2 font-normal"
              />
            </label>
          </div>
          {error ? (
            <p role="alert" className="text-sm font-bold text-[var(--mt-danger)]">
              {error}
            </p>
          ) : null}
          <PixelButton tone="danger" onClick={() => void cancel()}>
            Cancel
          </PixelButton>
        </div>
      ) : null}

      {step === "edit" && source && cropSession ? (
        <div className="space-y-2">
          {error ? (
            <p role="alert" className="text-sm font-bold text-[var(--mt-danger)]">
              {error}
            </p>
          ) : null}
          {barcode ? (
            <p className="text-xs font-bold">
              Barcode preserved: <span className="font-extrabold">{barcode}</span>
            </p>
          ) : null}
          <LabelImageCropEditor
            key={`${source.previewUrl}-${editGeneration}`}
            imageUrl={source.previewUrl}
            sourceWidth={source.width}
            sourceHeight={source.height}
            initialRotation={cropSession.rotation}
            initialCrop={cropSession.crop}
            onConfirm={(session) => void runOcr(session)}
            onRetake={retake}
            onCancel={() => void cancel()}
          />
        </div>
      ) : null}

      {step === "processing" ? (
        <div className="space-y-3">
          <p role="status" aria-live="polite" className="text-sm font-bold">
            Reading label… ({progress?.status ?? "starting"})
          </p>
          <ProgressMeter
            label="OCR progress"
            value={Math.round((progress?.progress ?? 0) * 100)}
            max={100}
            unit="%"
            tone="cyan"
          />
          <PixelButton tone="danger" onClick={() => void cancel()}>
            Cancel
          </PixelButton>
        </div>
      ) : null}

      {step === "review" && captureId ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 border-2 border-[var(--mt-ink)] bg-white/70 p-2">
            <PixelButton tone="neutral" onClick={() => void beginRecrop()}>
              Recrop and scan again
            </PixelButton>
            <PixelButton
              tone="neutral"
              onClick={() => void beginRecrop({ nudgeRotate: true })}
            >
              Rotate and scan again
            </PixelButton>
            <PixelButton tone="neutral" onClick={useTextAnyway}>
              Use this text anyway
            </PixelButton>
            <PixelButton tone="purple" onClick={enterValuesManually}>
              Enter values manually
            </PixelButton>
          </div>
          {manualEntry ? (
            <p role="status" className="text-sm font-bold">
              Manual entry — OCR suggestions cleared. Fill the form from the label.
            </p>
          ) : null}
          {barcode ? (
            <p className="text-xs font-bold">
              Barcode: <span className="font-extrabold">{barcode}</span>
            </p>
          ) : null}
          <LabelReviewForm
            key={`${captureId}-${manualEntry ? "manual" : "ocr"}-${rawText.slice(0, 24)}`}
            captureId={captureId}
            barcode={barcode}
            extractedFields={extractedFields}
            rawText={rawText}
            onCancel={() => void cancel()}
            onSaved={onSaved}
          />
        </div>
      ) : null}
    </RetroWindow>
  );
}
