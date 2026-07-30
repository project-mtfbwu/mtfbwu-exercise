"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelButton } from "@/shared/ui/flat-lay/pixel-button";
import { RetroWindow } from "@/shared/ui/flat-lay/retro-window";
import { createSupabaseBrowserClient } from "@/shared/database/client";
import { putLabelCaptureDraft } from "@/shared/offline/label-capture-draft";
import {
  createScanDedupe,
  isProductLookupBarcode,
  isSecureCameraContext,
  normalizeBarcode,
  type BarcodeScanResult,
  type BarcodeScannerAdapter,
  type CameraDevice,
} from "@/modules/nutrition/barcode";
import { ProductReviewCard, type ProductReviewFood } from "./product-review-card";

type ScanPhase =
  | "starting"
  | "scanning"
  | "looking-up"
  | "found"
  | "not-found"
  | "offline-queued"
  | "error"
  | "unsupported";

type BarcodeLookupResponse = {
  error?: string;
  food?: {
    id: string;
    source: string;
    name: string;
    brand: string | null;
    barcode: string | null;
    nutrientsPer100g?: ProductReviewFood["nutrientsPer100g"];
    serving: { label: string; gramWeight: number | null } | null;
  };
};

const SCAN_COOLDOWN_MS = 2500;

function toReviewFood(
  food: NonNullable<BarcodeLookupResponse["food"]>,
): ProductReviewFood {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    source: food.source,
    servingGrams: food.serving?.gramWeight ?? null,
    servingLabel: food.serving?.label ?? null,
    nutrientsPer100g: food.nutrientsPer100g ?? {},
  };
}

/**
 * Nested scanning surface shown inside the meal focus panel. Lives as a
 * plain `RetroWindow` (not another `FocusPanel`) so it reads as a program
 * window opened over the meal's paper focus, rather than duplicating the
 * outer panel's chrome/banner.
 */
export function BarcodeScannerPanel({
  titleId,
  online,
  onClose,
  onProductConfirmed,
  onCaptureLabel,
  onCreateCustom,
}: {
  titleId: string;
  online: boolean;
  onClose: () => void;
  onProductConfirmed: (food: ProductReviewFood, amountG: number) => void;
  onCaptureLabel: (barcode: string | null) => void;
  onCreateCustom: (barcode: string | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const adapterRef = useRef<BarcodeScannerAdapter | null>(null);
  const dedupeRef = useRef(createScanDedupe({ cooldownMs: SCAN_COOLDOWN_MS }));
  const mountedRef = useRef(true);

  const [phase, setPhase] = useState<ScanPhase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(null);
  const [reviewFood, setReviewFood] = useState<ProductReviewFood | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const performLookup = useCallback(
    async (normalized: string) => {
      dedupeRef.current.lock();
      setCurrentBarcode(normalized);
      setError(null);
      setPhase("looking-up");

      if (!online) {
        try {
          const supabase = createSupabaseBrowserClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          await putLabelCaptureDraft({
            id: crypto.randomUUID(),
            userId: user?.id ?? "unknown",
            barcode: normalized,
            payload: { reason: "offline_barcode_lookup" },
          });
        } catch {
          // Best-effort — the not-found flow still lets the user capture a
          // label or create a custom food without the draft.
        }
        if (mountedRef.current) setPhase("offline-queued");
        return;
      }

      try {
        const response = await fetch(
          `/api/nutrition/barcode/${encodeURIComponent(normalized)}`,
        );
        const payload = (await response.json()) as BarcodeLookupResponse;
        if (!mountedRef.current) return;
        if (response.status === 404) {
          setPhase("not-found");
          return;
        }
        if (!response.ok || !payload.food) {
          setError(payload.error ?? "Barcode lookup is temporarily unavailable.");
          setPhase("error");
          return;
        }
        setReviewFood(toReviewFood(payload.food));
        setPhase("found");
      } catch {
        if (mountedRef.current) {
          setError("Barcode lookup failed. Check your connection and try again.");
          setPhase("error");
        }
      }
    },
    [online],
  );

  const handleResult = useCallback(
    (result: BarcodeScanResult) => {
      if (!dedupeRef.current.accept(result.normalizedValue)) return;
      if (!isProductLookupBarcode(result.normalizedValue, result.format)) return;
      void performLookup(result.normalizedValue);
    },
    [performLookup],
  );

  const startScanner = useCallback(
    async (deviceId?: string) => {
      if (!isSecureCameraContext()) {
        setError("Camera access requires HTTPS (or localhost during development).");
        setPhase("unsupported");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      try {
        setPhase("starting");
        const { createBarcodeScanner } =
          await import("@/modules/nutrition/barcode/create-scanner");
        const adapter = await createBarcodeScanner();
        if (!mountedRef.current) {
          await adapter.stop();
          return;
        }
        adapterRef.current = adapter;
        await adapter.start({
          videoElement: video,
          deviceId,
          preferredFacingMode: "environment",
          onResult: handleResult,
          onError: (scanError) => {
            if (mountedRef.current) setError(scanError.message);
          },
        });
        if (!mountedRef.current) return;
        setPhase("scanning");
        setTorchSupported(typeof adapter.setTorch === "function");
        try {
          const devices = await adapter.listCameras();
          if (mountedRef.current) setCameras(devices);
        } catch {
          // Camera enumeration is a nice-to-have; scanning still works without it.
        }
      } catch (startError) {
        if (!mountedRef.current) return;
        setError(
          startError instanceof Error
            ? startError.message
            : "Could not access the camera.",
        );
        setPhase("unsupported");
      }
    },
    [handleResult],
  );

  useEffect(() => {
    mountedRef.current = true;
    // Deferred via `.then()` (mirrors the `loadMealsForDailyRecord(...).then(...)`
    // pattern elsewhere) so no state update from `startScanner` runs
    // synchronously within this effect's own execution.
    Promise.resolve().then(() => {
      if (mountedRef.current) void startScanner();
    });
    return () => {
      mountedRef.current = false;
      void adapterRef.current?.stop();
      adapterRef.current = null;
    };
    // Only ever start once per mount — camera switches call startScanner directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        void adapterRef.current?.stop();
      } else if (phase === "scanning" && adapterRef.current) {
        void startScanner(selectedDeviceId);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [phase, selectedDeviceId, startScanner]);

  async function handleClose() {
    await adapterRef.current?.stop();
    adapterRef.current = null;
    onClose();
  }

  async function switchCamera(deviceId: string) {
    setSelectedDeviceId(deviceId);
    await adapterRef.current?.stop();
    await startScanner(deviceId);
  }

  async function toggleTorch() {
    const adapter = adapterRef.current;
    if (!adapter?.setTorch) {
      setTorchSupported(false);
      return;
    }
    const next = !torchOn;
    const ok = await adapter.setTorch(next);
    if (!ok) {
      setTorchSupported(false);
      return;
    }
    setTorchOn(next);
  }

  function resumeScanning() {
    setReviewFood(null);
    setCurrentBarcode(null);
    setError(null);
    dedupeRef.current.unlock();
    setPhase("scanning");
  }

  function submitManualCode() {
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    const normalized = normalizeBarcode(trimmed);
    if (!normalized.ok) {
      setError(normalized.reason);
      setPhase("error");
      return;
    }
    void performLookup(normalized.normalized);
  }

  async function handleUploadBarcodeImage(file: File) {
    setUploadBusy(true);
    setError(null);
    try {
      let adapter = adapterRef.current;
      if (!adapter) {
        const { createBarcodeScanner } =
          await import("@/modules/nutrition/barcode/create-scanner");
        adapter = await createBarcodeScanner();
      }
      const result = await adapter.scanImage(file);
      if (!result) {
        setError("No barcode was detected in that image.");
        setPhase("error");
        return;
      }
      if (!isProductLookupBarcode(result.normalizedValue, result.format)) {
        setError("The code found in that image isn't a product barcode.");
        setPhase("error");
        return;
      }
      await performLookup(result.normalizedValue);
    } finally {
      setUploadBusy(false);
    }
  }

  function confirmProduct(amountG: number) {
    if (!reviewFood) return;
    onProductConfirmed(reviewFood, amountG);
  }

  const statusText: Record<ScanPhase, string> = {
    starting: "Starting camera…",
    scanning: "Scanning…",
    "looking-up": "Looking up…",
    found: "Product found",
    "not-found": "Not found",
    "offline-queued": "Offline — saved for later",
    error: error ?? "Something went wrong",
    unsupported: error ?? "Camera is not available",
  };

  return (
    <RetroWindow
      title="Scan barcode"
      titleId={titleId}
      accent="cyan"
      onClose={() => void handleClose()}
    >
      <p role="status" aria-live="polite" className="mb-2 text-sm font-bold">
        {statusText[phase]}
      </p>

      {phase !== "found" ? (
        <div className="relative aspect-video w-full overflow-hidden border-2 border-[var(--mt-ink)] bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
            aria-label="Camera preview for barcode scanning"
          />
          {phase === "scanning" ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-6 border-2 border-[var(--mt-neon-lime)] sm:inset-10"
            />
          ) : null}
        </div>
      ) : null}

      {phase === "scanning" || phase === "starting" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {cameras.length > 1 ? (
            <label className="text-sm font-bold" htmlFor="scanner-camera-select">
              Camera
              <select
                id="scanner-camera-select"
                value={selectedDeviceId ?? ""}
                onChange={(event) => void switchCamera(event.target.value)}
                className="mt-1 block min-h-11 border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <PixelButton
            tone="neutral"
            disabled={!torchSupported}
            aria-pressed={torchOn}
            onClick={() => void toggleTorch()}
          >
            {torchOn ? "Torch on" : "Torch"}
          </PixelButton>
        </div>
      ) : null}

      {phase === "found" && reviewFood ? (
        <ProductReviewCard
          food={reviewFood}
          onConfirm={confirmProduct}
          onCancel={resumeScanning}
        />
      ) : null}

      {phase === "not-found" || phase === "offline-queued" ? (
        <div className="mt-3 space-y-2 border-2 border-dashed border-[var(--mt-ink)] bg-[var(--mt-paper-warm)] p-3">
          <p className="text-sm font-bold">
            {phase === "offline-queued"
              ? "You're offline — this barcode was saved on this device. Capture the label or add a custom food now, or try again once you're back online."
              : `No catalog match for barcode ${currentBarcode ?? ""}.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <PixelButton tone="cyan" onClick={resumeScanning}>
              Scan again
            </PixelButton>
            <PixelButton tone="primary" onClick={() => onCaptureLabel(currentBarcode)}>
              Capture label
            </PixelButton>
            <PixelButton tone="purple" onClick={() => onCreateCustom(currentBarcode)}>
              Create custom
            </PixelButton>
            <PixelButton tone="neutral" onClick={() => void handleClose()}>
              Cancel
            </PixelButton>
          </div>
        </div>
      ) : null}

      {phase === "error" || phase === "unsupported" ? (
        <div className="mt-3 space-y-2 border-2 border-[var(--mt-danger)] bg-white p-3">
          <p role="alert" className="text-sm font-bold text-[var(--mt-danger)]">
            {error}
          </p>
          <div className="flex flex-wrap gap-2">
            <PixelButton tone="cyan" onClick={() => void startScanner(selectedDeviceId)}>
              Retry camera
            </PixelButton>
            <PixelButton tone="neutral" onClick={resumeScanning}>
              Dismiss
            </PixelButton>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 border-t-2 border-[var(--mt-ink)] pt-3 sm:grid-cols-[1fr_auto]">
        <label className="text-sm font-bold" htmlFor="scanner-manual-code">
          Enter barcode manually
          <input
            id="scanner-manual-code"
            inputMode="numeric"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitManualCode();
            }}
            className="mt-1 block min-h-11 w-full border-2 border-[var(--mt-ink)] bg-white px-2 font-normal"
            placeholder="e.g. 3017620422003"
          />
        </label>
        <PixelButton tone="cyan" className="self-end" onClick={submitManualCode}>
          Look up
        </PixelButton>
      </div>

      <label className="mt-2 block text-sm font-bold" htmlFor="scanner-upload-image">
        Or upload a photo of the barcode
        <input
          id="scanner-upload-image"
          type="file"
          accept="image/*"
          disabled={uploadBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleUploadBarcodeImage(file);
          }}
          className="mt-1 block w-full border-2 border-[var(--mt-ink)] bg-white px-2 py-2 font-normal"
        />
      </label>

      <div className="mt-3">
        <PixelButton tone="danger" onClick={() => void handleClose()}>
          Close scanner
        </PixelButton>
      </div>
    </RetroWindow>
  );
}
